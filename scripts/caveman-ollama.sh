#!/usr/bin/env bash

# @raycast.schemaVersion 1
# @raycast.title Caveman (Ollama Gemma)
# @raycast.mode silent
# @raycast.icon 🪨

set -euo pipefail
exec "$(dirname "$0")/caveman-pick.sh" ollama-local
