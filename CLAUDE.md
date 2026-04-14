# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Raycast extension that wraps the external [`caveman-compress`](https://github.com/doublej/caveman-compress) CLI — a tool that compresses text via multiple LLM/heuristic backends (`claude`, `codex`, `opencode`, `ollama-local`, `nlp-local`). The extension does no compression itself; it is a thin UI + subprocess layer over the CLI.

## Commands

```sh
npm install
npm run build      # ray build --skip-types -e dist -o dist
npm run dev        # ray develop — registers + hot-reloads in Raycast
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
```

No test suite. Verify manually in Raycast after `npm run dev`.

## Architecture

Four Raycast commands declared in `package.json` → `commands[]`, each a file under `src/`:

- `compress.tsx` — `no-view`. Captures selection, runs backend, HUDs result.
- `compress-with-preview.tsx` — `view`. Backend picker + preview before paste.
- `stats.tsx` — reads `caveman-compress stats --json`.
- `history.tsx` — tails `~/.caveman-compress/jobs.jsonl` directly (read-only JSONL, reverse-chronological).

All CLI interaction goes through `src/lib/cli.ts`, which `execFile`s the binary resolved from the `cliPath` pref. The `compress` subcommand takes input via **stdin**, never argv. `PATH` is rebuilt per-call from the `extraPath` pref (`src/lib/prefs.ts::buildPath`) so the CLI can find child backend binaries (`claude`, `codex`, `opencode`, `ollama`) that Raycast's default env would miss — if a backend spawn fails, `extraPath` is almost always the cause.

Selection capture (`src/lib/selection.ts`) uses an AppleScript `Cmd+C` keystroke with a 180ms delay, then reads the clipboard. It does **not** restore the prior clipboard — the compressed output replaces it.

### Privacy contract

The CLI only logs SHA-256 hash prefixes of inputs (`jobs.jsonl` stores `input_hash`, never raw text). The extension must preserve this: do not persist selection text or compressed output anywhere on disk.

### Backend list

The `compress` command's dropdown `data` array in `package.json` and the `defaultBackend` pref's `data` array must stay in sync with the CLI's supported backends. When adding a backend, update both.

## scripts/

Legacy Bash script-command versions of the same functionality, kept for users who don't want the React extension. Not part of the build. `caveman-pick.sh` is the only one with logic; the others just `exec` it with a backend arg.
