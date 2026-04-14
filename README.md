# Caveman Compress (Raycast)

Compress text via multiple LLM/heuristic backends. Raycast UI over the [`caveman-compress`](https://github.com/doublej/caveman-compress) CLI.

## Install

1. Install the CLI (see its README for full instructions):
   ```sh
   git clone https://github.com/doublej/caveman-compress
   cd caveman-compress
   bun install && bun tsc
   chmod +x dist/index.js
   ln -sf "$PWD/dist/index.js" ~/.bun/bin/caveman-compress
   caveman-compress check --json   # smoke test
   ```
2. Install + register the extension:
   ```sh
   git clone https://github.com/doublej/raycast-ext-caveman-compress
   cd raycast-ext-caveman-compress
   npm install
   npm run build
   npm run dev   # registers in Raycast
   ```

## Commands

- **Compress Selection** (`compress`) — capture selection (Cmd+C), compress via dropdown backend, paste back.
- **Compress (Preview)** — pick backend, preview output before paste.
- **Stats** — per-backend ratio + p50/p95 duration.
- **Job History** — recent jobs (hash-only, no raw text).

## Preferences

| Key | Default | Notes |
|---|---|---|
| `cliPath` | `$HOME/.bun/bin/caveman-compress` | Path to CLI binary |
| `defaultBackend` | `claude` | Used when arg = "default" |
| `autoPaste` | true | Paste vs copy-only |
| `extraPath` | bun/local/opencode/brew dirs | Prepended to PATH for backend subprocesses |

## Troubleshooting

- **"caveman-compress not found"** — verify `cliPath` pref or run `which caveman-compress`.
- **Backend spawn fails** — extend `extraPath` pref so the CLI can find `claude` / `codex` / `opencode` binaries.
- **Ollama offline** — check `~/.caveman-compress` config; the `ollama-local` backend pings the host configured in the CLI.
- **Input > 50k chars** — CLI rejects; trim selection.

## Privacy

The CLI logs only SHA-256 hash prefixes, never raw text. The extension does not persist input either.

## License

MIT
