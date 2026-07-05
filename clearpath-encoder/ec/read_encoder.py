#!/usr/bin/env python3
"""CLI for reading encoder feedback from a ClearPath-EC motor."""

from __future__ import annotations

import argparse
import json
import sys

from clearpath_ec import ClearPathEcEncoderReader


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Read encoder position from a ClearPath-EC servo over EtherCAT."
    )
    parser.add_argument(
        "interface",
        help="EtherCAT NIC name (for example eth0 or enp3s0)",
    )
    parser.add_argument(
        "-s",
        "--slave",
        type=int,
        default=0,
        help="EtherCAT slave index (default: 0)",
    )
    parser.add_argument(
        "-r",
        "--rate",
        type=float,
        default=50.0,
        help="Sample rate in Hz (default: 50)",
    )
    parser.add_argument(
        "-1",
        "--once",
        action="store_true",
        help="Print one sample and exit",
    )
    parser.add_argument(
        "--sdo",
        action="store_true",
        help="Read via SDO instead of cyclic PDO (slower, but works without OP mapping)",
    )
    parser.add_argument(
        "-j",
        "--json",
        action="store_true",
        help="Emit newline-delimited JSON",
    )
    return parser


def format_sample(sample, slave_index: int, as_json: bool) -> str:
    payload = {
        "slave": slave_index,
        "position_counts": sample.position_counts,
        "velocity_counts_per_sec": sample.velocity_counts_per_sec,
        "mechanical_position": sample.mechanical_position,
        "timestamp_s": sample.timestamp_s,
    }
    if as_json:
        return json.dumps(payload, separators=(",", ":"))
    parts = [
        f"slave={slave_index}",
        f"position_counts={sample.position_counts}",
    ]
    if sample.velocity_counts_per_sec is not None:
        parts.append(f"velocity_counts_per_sec={sample.velocity_counts_per_sec}")
    if sample.mechanical_position is not None:
        parts.append(f"mechanical_position={sample.mechanical_position}")
    parts.append(f"timestamp_s={sample.timestamp_s:.6f}")
    return " ".join(parts)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        with ClearPathEcEncoderReader(
            interface=args.interface,
            slave_index=args.slave,
            use_pdo=not args.sdo,
        ) as reader:
            if args.once:
                sample = reader.read_once()
                print(format_sample(sample, args.slave, args.json))
                return 0

            for sample in reader.stream(args.rate):
                print(format_sample(sample, args.slave, args.json))
                sys.stdout.flush()
    except KeyboardInterrupt:
        return 0
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
