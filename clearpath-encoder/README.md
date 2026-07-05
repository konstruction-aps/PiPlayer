# ClearPath Encoder Reader

Software for reading encoder position from Teknic ClearPath integrated servos.

ClearPath motors always use an internal optical encoder for closed-loop control, but **how you read that position from your computer depends on the motor family**:

| Family | Encoder readable by host? | This project |
| --- | --- | --- |
| **ClearPath-SC** | Yes, over USB/RS-232 via Teknic's sFoundation library | `sc/read_encoder` |
| **ClearPath-EC** | Yes, over EtherCAT (CiA 402 object `0x6064`) | `ec/read_encoder.py` |
| **ClearPath-IP** | Yes, over EtherNet/IP assemblies / AOI tags | Not included here (use your PLC's data exchange) |
| **ClearPath-SD / MC / CPV** | No direct encoder export to the host | Use HLFB status output, or add an external encoder |

## Quick start (no hardware)

```bash
python3 clearpath_encoder.py mock --once
python3 clearpath_encoder.py mock -r 10
```

## ClearPath-SC (USB / RS-232)

### Requirements

1. A **ClearPath-SC** motor (part numbers like `CPM-SC...`)
2. An **SC4-HUB** (USB) or RS-232 connection to the host
3. Teknic's **Linux_Software.tar.gz** or Windows ClearView SDK from [teknic.com/downloads](https://www.teknic.com/downloads/)

### Build

```bash
export SFND_ROOT=/path/to/Linux_Software
cd sc
make
# or
cmake -S . -B build && cmake --build build
```

On Linux you may also need Teknic's Exar USB kernel module from the same SDK package before the hub is detected.

### Run

```bash
./read_encoder --once
./read_encoder -r 50
./read_encoder -a -j          # all nodes, JSON output
./read_encoder -c /dev/ttyUSB0
```

Output fields:

- `position_counts` — measured shaft position from the internal encoder (encoder counts)
- `velocity_counts_per_sec` — measured velocity
- `timestamp_ms` — host timestamp from sFoundation

The reader opens the hub and streams feedback. It does **not** enable the motor or command motion.

## ClearPath-EC (EtherCAT)

### Requirements

1. A **ClearPath-EC** motor on an EtherCAT network
2. A Linux host with an EtherCAT-capable NIC
3. Python 3.9+ and `pysoem`

### Install

```bash
cd ec
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the EtherCAT reader as root (or with the capabilities your NIC driver requires):

```bash
sudo .venv/bin/python read_encoder.py eth0 --once
sudo .venv/bin/python read_encoder.py eth0 -r 100 -j
sudo .venv/bin/python read_encoder.py eth0 --sdo --once
```

By default the reader unpacks the standard TxPDO that includes:

- `0x6064` Position Actual Value
- `0x606C` Velocity Actual Value

Use `--sdo` if you need non-cyclic reads or your PDO mapping differs.

## Unified CLI

```bash
python3 clearpath_encoder.py mock --once
python3 clearpath_encoder.py sc --once --sc-binary ./sc/read_encoder
python3 clearpath_encoder.py ec eth0 --once
```

## Encoder resolution

Typical ClearPath encoder densities:

- Many SC / SD / MC models: **12,800 counts/rev** (`-R` variants)
- High-resolution models: **51,200 counts/rev** (`-E` variants)

Convert to degrees:

```text
degrees = (position_counts % counts_per_rev) * 360.0 / counts_per_rev
```

## Troubleshooting

### SC: "No ClearPath SC hub found"

- Confirm the SC4-HUB USB cable is connected
- Install/build Teknic's Linux USB driver from `Linux_Software.tar.gz`
- List devices and pass `--com-port` explicitly

### SC: build errors about `pubSysCls`

- Verify `SFND_ROOT` points at the extracted SDK root
- Build `libpubSysCls.a` using Teknic's included Linux instructions before compiling this project

### EC: PDO size mismatch

- Run with `--sdo` to read `0x6064` directly
- Compare your slave's ESI/PDO mapping against `ec/clearpath_ec/reader.py`

### SD / MC motors

These families do not expose raw encoder counts to the host. Options:

- Use **HLFB** (High Level Feedback) for move-done / in-range status
- Mount an **external encoder** and read it with your motion controller
- Upgrade to **ClearPath-SC** or **-EC** if you need software position feedback

## References

- [ClearPath-SC User Manual](https://teknic.com/files/downloads/Clearpath-SC%20User%20Manual.pdf)
- [ClearPath-EC Software Reference](https://teknic.com/files/downloads/ClearPath-EC_Software_Reference.pdf)
- [Teknic FAQ — encoder access by model](https://teknic.com/faq/)
