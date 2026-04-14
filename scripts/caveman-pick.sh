#!/usr/bin/env bash

# @raycast.schemaVersion 1
# @raycast.title Caveman Compress
# @raycast.mode silent
# @raycast.packageName Caveman Compress
# @raycast.icon 🪨
# @raycast.description Compress selected text caveman-style via chosen backend
# @raycast.argument1 { "type": "dropdown", "placeholder": "backend", "data": [ {"title": "Claude (sonnet)", "value": "claude"}, {"title": "Codex (gpt-5.4-mini)", "value": "codex"}, {"title": "Opencode (minimax)", "value": "opencode"}, {"title": "Ollama (gemma4)", "value": "ollama-local"}, {"title": "NLP local", "value": "nlp-local"} ] }

set -euo pipefail

export PATH="$HOME/.bun/bin:$HOME/.local/bin:$HOME/.opencode/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

BACKEND="$1"
CAVEMAN_BIN="${CAVEMAN_BIN:-caveman-compress}"

if ! "$CAVEMAN_BIN" check "$BACKEND" >/dev/null 2>&1; then
  echo "Backend '$BACKEND' offline — skipping"
  exit 0
fi

selected=$(osascript -e '
tell application "System Events"
    keystroke "c" using {command down}
end tell
delay 0.15
return (the clipboard as text)
')

if [ -z "$selected" ]; then
  echo "No text selected"
  exit 1
fi

output=$(printf "%s" "$selected" | "$CAVEMAN_BIN" compress "$BACKEND" 2>/dev/null)

if [ -z "$output" ]; then
  echo "Compression returned empty output"
  exit 1
fi

printf "%s" "$output" | pbcopy

osascript -e '
tell application "System Events"
    keystroke "v" using {command down}
end tell
'

echo "Compressed via $BACKEND"
