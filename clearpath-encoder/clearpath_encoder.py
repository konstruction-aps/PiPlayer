#!/usr/bin/env python3
"""Unified entry point for ClearPath encoder readers."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read encoder feedback from Teknic ClearPath servos."
    )
    parser.add_argument(
        "backend",
        choices=("sc", "ec", "mock"),
        help="Motor interface: sc (ClearPath-SC), ec (ClearPath-EC), or mock (no hardware)",
    )

    sc = parser.add_argument_group("ClearPath-SC options")
    sc.add_argument("--sc-binary", default="read_encoder", help="Path to the SC reader binary")
    sc.add_argument("-p", "--port", type=int, default=0, help="Hub port index")
    sc.add_argument("-n", "--node", type=int, default=0, help="Motor node index")
    sc.add_argument("-a", "--all-nodes", action="store_true", help="Read every node on the hub")
    sc.add_argument("-c", "--com-port", help="Serial device path for the SC hub")

    ec = parser.add_argument_group("ClearPath-EC options")
    ec.add_argument("interface", nargs="?", help="EtherCAT NIC (required for ec backend)")
    ec.add_argument("-s", "--slave", type=int, default=0, help="EtherCAT slave index")
    ec.add_argument("--sdo", action="store_true", help="Use SDO reads instead of PDO")

    parser.add_argument("-r", "--rate", type=float, default=50.0, help="Sample rate in Hz")
    parser.add_argument("-1", "--once", action="store_true", help="Print one sample and exit")
    parser.add_argument("-j", "--json", action="store_true", help="Emit newline-delimited JSON")
    return parser


def run_mock(args: argparse.Namespace) -> int:
    position = 0
    velocity = 1280

    def emit() -> None:
        nonlocal position, velocity
        payload = {
            "backend": "mock",
            "position_counts": position,
            "velocity_counts_per_sec": velocity,
            "timestamp_s": time.time(),
        }
        if args.json:
            print(json.dumps(payload, separators=(",", ":")))
        else:
            print(
                "backend=mock "
                f"position_counts={position} "
                f"velocity_counts_per_sec={velocity} "
                f"timestamp_s={payload['timestamp_s']:.6f}"
            )
        position += velocity // int(args.rate or 1)
        sys.stdout.flush()

    emit()
    if args.once:
        return 0

    period = 1.0 / args.rate
    while True:
        time.sleep(period)
        emit()


def run_sc(args: argparse.Namespace) -> int:
    cmd = [args.sc_binary]
    cmd.extend(["--port", str(args.port)])
    if args.all_nodes:
        cmd.append("--all-nodes")
    else:
        cmd.extend(["--node", str(args.node)])
    if args.com_port:
        cmd.extend(["--com-port", args.com_port])
    cmd.extend(["--rate", str(int(args.rate))])
    if args.once:
        cmd.append("--once")
    if args.json:
        cmd.append("--json")

    return subprocess.call(cmd)


def run_ec(args: argparse.Namespace) -> int:
    if not args.interface:
        print("error: ec backend requires an EtherCAT interface argument", file=sys.stderr)
        return 2

    script = Path(__file__).resolve().parent / "ec" / "read_encoder.py"
    cmd = [sys.executable, str(script), args.interface]
    cmd.extend(["--slave", str(args.slave)])
    cmd.extend(["--rate", str(args.rate)])
    if args.once:
        cmd.append("--once")
    if args.sdo:
        cmd.append("--sdo")
    if args.json:
        cmd.append("--json")

    return subprocess.call(cmd)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.backend == "mock":
        try:
            return run_mock(args)
        except KeyboardInterrupt:
            return 0

    if args.backend == "sc":
        return run_sc(args)

    return run_ec(args)


if __name__ == "__main__":
    raise SystemExit(main())
