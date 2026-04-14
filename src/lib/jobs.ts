import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface JobRecord {
  ts: string;
  backend: string;
  model: string;
  input_hash: string;
  input_tokens: number;
  output_tokens: number;
  ratio: number;
  duration_ms: number;
}

const LOG_FILE = join(homedir(), ".caveman-compress", "jobs.jsonl");

export function readJobs(): JobRecord[] {
  let raw: string;
  try {
    raw = readFileSync(LOG_FILE, "utf8");
  } catch {
    return [];
  }
  const out: JobRecord[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip corrupt */
    }
  }
  return out.reverse();
}
