import { Clipboard } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { statSync } from "node:fs";
import { extname } from "node:path";
import { homedir } from "node:os";

const execFileP = promisify(execFile);

const VALID_EXT = new Set([".md", ".txt"]);

export interface DetectResult {
  files: string[];
  source: "finder" | "clipboard" | "none";
  finderError?: string;
  clipboardError?: string;
}

function expandHome(p: string): string {
  return p.replace(/^~(?=\/|$)/, homedir());
}

function decodeFileUrl(p: string): string {
  if (!p.startsWith("file://")) return p;
  try {
    return decodeURI(p.replace(/^file:\/\/(localhost)?/, ""));
  } catch {
    return p;
  }
}

function normalizePath(raw: string): string {
  const unquoted = raw.trim().replace(/^["']|["']$/g, "");
  return expandHome(decodeFileUrl(unquoted));
}

function isCompressibleFile(p: string): boolean {
  if (!p || !p.startsWith("/")) return false;
  if (!VALID_EXT.has(extname(p).toLowerCase())) return false;
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

const FINDER_SCRIPT = `
tell application "Finder"
  set _sel to selection
  set _out to {}
  repeat with _i in _sel
    try
      set end of _out to POSIX path of (_i as alias)
    end try
  end repeat
end tell
set AppleScript's text item delimiters to linefeed
return _out as text
`;

export async function getFinderSelection(): Promise<{
  files: string[];
  error?: string;
}> {
  try {
    const { stdout } = await execFileP("osascript", ["-e", FINDER_SCRIPT], {
      timeout: 3_000,
    });
    const all = stdout.split("\n").map(normalizePath).filter(Boolean);
    const files = all.filter(isCompressibleFile);
    if (all.length > 0 && files.length === 0) {
      return {
        files: [],
        error: `Finder selection had ${all.length} item(s) but none were .md/.txt`,
      };
    }
    return { files };
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    const msg = (err.stderr || err.message || "osascript failed")
      .trim()
      .split("\n")[0];
    return { files: [], error: msg };
  }
}

export async function getClipboardFilePaths(): Promise<{
  files: string[];
  error?: string;
}> {
  try {
    const text = (await Clipboard.readText()) || "";
    if (!text) return { files: [] };
    const lines = text.split(/\r?\n/).map(normalizePath).filter(Boolean);
    const files = lines.filter(isCompressibleFile);
    if (lines.length > 0 && files.length === 0) {
      return {
        files: [],
        error: `Clipboard had ${lines.length} line(s), none resolved to .md/.txt`,
      };
    }
    return { files };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { files: [], error: err.message || "clipboard read failed" };
  }
}

export async function resolveFileTargets(): Promise<DetectResult> {
  const finder = await getFinderSelection();
  if (finder.files.length > 0) {
    return { files: finder.files, source: "finder" };
  }
  const clip = await getClipboardFilePaths();
  if (clip.files.length > 0) {
    return { files: clip.files, source: "clipboard" };
  }
  return {
    files: [],
    source: "none",
    finderError: finder.error,
    clipboardError: clip.error,
  };
}
