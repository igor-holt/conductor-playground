from __future__ import annotations

import argparse
from pathlib import Path

from .bench import run_bench
from .probe import verify_probe


def main() -> None:
    parser = argparse.ArgumentParser(description="Genesis eta_thermo sim harness")
    subparsers = parser.add_subparsers(dest="command", required=True)

    bench_parser = subparsers.add_parser("bench", help="Run deterministic bench flow")
    bench_parser.add_argument("--out", type=Path, required=True)

    probe_parser = subparsers.add_parser("probe", help="Run deterministic probe flow")
    probe_parser.add_argument("--out", type=Path, required=True)
    probe_parser.add_argument("--intruder", action="store_true")

    args = parser.parse_args()
    if args.command == "bench":
        print(run_bench(args.out))
        return
    if args.command == "probe":
        print(verify_probe(args.out, intruder=args.intruder))


if __name__ == "__main__":
    main()
