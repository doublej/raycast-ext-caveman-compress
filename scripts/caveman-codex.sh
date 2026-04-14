#!/usr/bin/env bash

# @raycast.schemaVersion 1
# @raycast.title Caveman (Codex)
# @raycast.mode silent
# @raycast.icon 🪨

set -euo pipefail
exec "$(dirname "$0")/caveman-pick.sh" codex
