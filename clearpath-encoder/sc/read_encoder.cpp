// ClearPath-SC encoder reader using Teknic's sFoundation library.
//
// Reads measured encoder position and velocity from a ClearPath-SC motor
// connected via USB (SC4-HUB) or RS-232.
//
// Requires Teknic Linux_Software.tar.gz (or Windows ClearView SDK):
//   https://www.teknic.com/downloads/

#include <cerrno>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

#include "pubSysCls.h"

using namespace sFnd;

namespace {

struct Options {
    int port_index = 0;
    int node_index = 0;
    int rate_hz = 50;
    bool json = false;
    bool once = false;
    bool all_nodes = false;
    const char *com_port = nullptr;
};

void print_usage(const char *prog) {
    std::fprintf(stderr,
                 "Usage: %s [options]\n"
                 "\n"
                 "Read encoder position from a ClearPath-SC servo.\n"
                 "\n"
                 "Options:\n"
                 "  -p, --port INDEX     Hub port index (default: 0)\n"
                 "  -n, --node INDEX     Motor node index on the hub (default: 0)\n"
                 "  -a, --all-nodes      Read every node on the selected hub port\n"
                 "  -c, --com-port PATH  Use a specific serial device (e.g. /dev/ttyUSB0)\n"
                 "  -r, --rate HZ        Sample rate in Hz (default: 50)\n"
                 "  -1, --once           Print one sample and exit\n"
                 "  -j, --json           Emit newline-delimited JSON objects\n"
                 "  -h, --help           Show this help\n",
                 prog);
}

bool parse_args(int argc, char **argv, Options &opts) {
    for (int i = 1; i < argc; ++i) {
        const char *arg = argv[i];
        if (std::strcmp(arg, "-h") == 0 || std::strcmp(arg, "--help") == 0) {
            print_usage(argv[0]);
            return false;
        }
        if (std::strcmp(arg, "-1") == 0 || std::strcmp(arg, "--once") == 0) {
            opts.once = true;
            continue;
        }
        if (std::strcmp(arg, "-j") == 0 || std::strcmp(arg, "--json") == 0) {
            opts.json = true;
            continue;
        }
        if (std::strcmp(arg, "-a") == 0 || std::strcmp(arg, "--all-nodes") == 0) {
            opts.all_nodes = true;
            continue;
        }
        if ((std::strcmp(arg, "-p") == 0 || std::strcmp(arg, "--port") == 0) && i + 1 < argc) {
            opts.port_index = std::atoi(argv[++i]);
            continue;
        }
        if ((std::strcmp(arg, "-n") == 0 || std::strcmp(arg, "--node") == 0) && i + 1 < argc) {
            opts.node_index = std::atoi(argv[++i]);
            continue;
        }
        if ((std::strcmp(arg, "-r") == 0 || std::strcmp(arg, "--rate") == 0) && i + 1 < argc) {
            opts.rate_hz = std::atoi(argv[++i]);
            continue;
        }
        if ((std::strcmp(arg, "-c") == 0 || std::strcmp(arg, "--com-port") == 0) && i + 1 < argc) {
            opts.com_port = argv[++i];
            continue;
        }

        std::fprintf(stderr, "Unknown option: %s\n", arg);
        print_usage(argv[0]);
        return false;
    }

    if (opts.rate_hz <= 0) {
        std::fprintf(stderr, "Sample rate must be positive.\n");
        return false;
    }

    return true;
}

void print_sample(const Options &opts, size_t node_index, double position_counts,
                  double velocity_counts_per_sec, double timestamp_ms) {
    if (opts.json) {
        std::printf(
            "{\"node\":%zu,\"position_counts\":%.0f,\"velocity_counts_per_sec\":%.3f,"
            "\"timestamp_ms\":%.3f}\n",
            node_index, position_counts, velocity_counts_per_sec, timestamp_ms);
    } else {
        std::printf("node=%zu position_counts=%.0f velocity_counts_per_sec=%.3f timestamp_ms=%.3f\n",
                    node_index, position_counts, velocity_counts_per_sec, timestamp_ms);
    }
    std::fflush(stdout);
}

}  // namespace

int main(int argc, char **argv) {
    Options opts;
    if (!parse_args(argc, argv, opts)) {
        return opts.rate_hz <= 0 ? 1 : 0;
    }

    SysManager mgr;

    try {
        size_t port_count = 0;

        if (opts.com_port != nullptr) {
            mgr.ComHubPort(static_cast<size_t>(opts.port_index), opts.com_port);
            port_count = static_cast<size_t>(opts.port_index) + 1;
        } else {
            std::vector<SysManager::ComHubPortSpec> hub_ports;
            SysManager::FindComHubPorts(hub_ports);

            if (hub_ports.empty()) {
                std::fprintf(stderr,
                             "No ClearPath SC hub found. Connect the SC4-HUB via USB or pass --com-port.\n");
                return 1;
            }

            for (size_t i = 0; i < hub_ports.size() && i < NET_CONTROLLER_MAX; ++i) {
                mgr.ComHubPort(i, hub_ports[i].c_str());
            }
            port_count = hub_ports.size();
        }

        if (opts.port_index < 0 || static_cast<size_t>(opts.port_index) >= port_count) {
            std::fprintf(stderr, "Port index %d is out of range (found %zu hub port(s)).\n",
                         opts.port_index, port_count);
            return 1;
        }

        mgr.PortsOpen(static_cast<size_t>(opts.port_index) + 1);
        IPort &port = mgr.Ports(static_cast<size_t>(opts.port_index));

        if (!port.OpenState()) {
            std::fprintf(stderr, "Failed to open ClearPath hub port %d.\n", opts.port_index);
            return 1;
        }

        if (port.NodeCount() == 0) {
            std::fprintf(stderr, "No motors detected on hub port %d.\n", opts.port_index);
            mgr.PortsClose();
            return 1;
        }

        std::vector<size_t> nodes;
        if (opts.all_nodes) {
            for (size_t i = 0; i < port.NodeCount(); ++i) {
                nodes.push_back(i);
            }
        } else {
            if (static_cast<size_t>(opts.node_index) >= port.NodeCount()) {
                std::fprintf(stderr, "Node index %d is out of range (port has %zu node(s)).\n",
                             opts.node_index, port.NodeCount());
                mgr.PortsClose();
                return 1;
            }
            nodes.push_back(static_cast<size_t>(opts.node_index));
        }

        for (size_t node_index : nodes) {
            INode &node = port.Nodes(node_index);
            node.Motion.PosnMeasured.AutoRefresh(true);
            node.Motion.VelMeasured.AutoRefresh(true);
        }

        const int period_ms = 1000 / opts.rate_hz;

        do {
            const double timestamp_ms = mgr.TimeStampMsec();
            for (size_t node_index : nodes) {
                INode &node = port.Nodes(node_index);
                const double position = static_cast<double>(node.Motion.PosnMeasured);
                const double velocity = static_cast<double>(node.Motion.VelMeasured);
                print_sample(opts, node_index, position, velocity, timestamp_ms);
            }

            if (!opts.once) {
                mgr.Delay(static_cast<double>(period_ms));
            }
        } while (!opts.once);

        mgr.PortsClose();
    } catch (const mnErr &err) {
        std::fprintf(stderr, "sFoundation error addr=%d code=0x%08x: %s\n", err.TheAddr,
                     err.ErrorCode, err.ErrorMsg);
        return 1;
    }

    return 0;
}
