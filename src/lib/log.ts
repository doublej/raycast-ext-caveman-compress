import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const LOG_FILE = join(
  homedir(),
  ".caveman-compress",
  "raycast-extension.log",
);

export function logEvent(fields: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...fields });
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, line + "\n", "utf8");
  } catch {
    /* ignore — logging must never throw */
  }
}

interface ErrLike {
  message?: string;
  stderr?: string;
  code?: number | null;
  stack?: string;
}

export function errToFields(e: unknown): Record<string, unknown> {
  const err = e as ErrLike;
  return {
    message: err.message,
    code: err.code ?? null,
    stderr: err.stderr,
    stack: err.stack,
  };
}
