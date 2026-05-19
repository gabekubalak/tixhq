#!/usr/bin/env bash
# All sanity checks that DON'T require hardware. Wire this into CI later.
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf "\n\033[1;34m==\033[0m %s\n" "$*"; }

step "Python byte-compile"
python3 -m compileall -q services tests ui/backend

step "JSON Schemas + recipe bounds"
python3 scripts/validate_schemas.py

step "Frame round-trip (Python is the canonical reference)"
PYTHONPATH=services/sensor-ingest python3 -m pytest tests/unit -q

step "Rust workspace check"
cargo check --workspace --quiet

step "Rust unit tests"
cargo test --workspace --quiet

printf "\n\033[1;32mAll verify checks passed.\033[0m\n"
