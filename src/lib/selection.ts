import { Clipboard } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export async function captureSelection(): Promise<string> {
  const original = await Clipboard.read().catch(() => null);
  await execFileP("osascript", [
    "-e",
    'tell application "System Events" to keystroke "c" using {command down}',
  ]);
  await new Promise((r) => setTimeout(r, 180));
  const text = (await Clipboard.readText()) || "";
  if (!text && original?.text) return original.text;
  return text;
}
