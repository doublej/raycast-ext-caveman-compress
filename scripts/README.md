# Script Commands (minimal install)

These Bash scripts are the **legacy** / minimal alternative to the full Raycast extension. They predate the extension and are kept for users who want the same functionality without installing the React-based extension.

## Install

1. Make sure the `caveman-compress` CLI binary is on `PATH` (see top-level README).
2. Symlink (or copy) this folder into a directory that Raycast watches:
   ```sh
   ln -sf "$PWD/scripts" ~/raycast-scripts/caveman-compress
   ```
3. In Raycast → Extensions → Script Commands → "Add Directory" → pick the parent dir.

## Override CLI path

Default invokes `caveman-compress` from `PATH`. To override (e.g. run from a checkout without installing the shim):

```sh
export CAVEMAN_BIN="$HOME/code/caveman-compress/dist/index.js"
```

## Files

- `caveman-pick.sh` — picker dropdown over all backends (the only script with logic).
- `caveman-{claude,codex,opencode,ollama,nlp}.sh` — one-shot per backend, each just `exec`s `caveman-pick.sh <backend>`.

## Why use the extension instead

- Live health indicators on the backend dropdown.
- Preview output before paste.
- Stats and history views.
- Structured HUDs instead of single-line `echo`.
