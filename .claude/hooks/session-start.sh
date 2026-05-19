#!/bin/bash
# GroveOS session-start hook.
#
# Runs in Claude Code on the web sessions only. Installs Python test deps,
# pre-warms cargo's target/ cache, and exercises `make verify` so any
# regression in the scaffold (schema bounds, frame contract, control-loop
# tests, etc.) surfaces at session start rather than mid-task.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

echo "[session-start] installing Python test deps"
python3 -m pip install --quiet -r tests/requirements.txt

echo "[session-start] running make verify (warms cargo + runs every test)"
make verify
