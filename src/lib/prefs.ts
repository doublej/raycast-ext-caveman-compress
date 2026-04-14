import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";

export interface Prefs {
  cliPath: string;
  defaultBackend: string;
  autoPaste: boolean;
  extraPath: string;
}

function expand(p: string): string {
  return p.replace(/^\$HOME/, homedir()).replace(/^~/, homedir());
}

export function prefs(): Prefs {
  const raw = getPreferenceValues<Prefs>();
  return {
    cliPath: expand(raw.cliPath || "$HOME/.bun/bin/caveman-compress"),
    defaultBackend: raw.defaultBackend || "claude",
    autoPaste: raw.autoPaste ?? true,
    extraPath: (raw.extraPath || "")
      .split(":")
      .map(expand)
      .filter(Boolean)
      .join(":"),
  };
}

export function buildPath(extra: string): string {
  const base = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  return extra ? `${extra}:${base}` : base;
}
