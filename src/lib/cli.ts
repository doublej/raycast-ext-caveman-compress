import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prefs, buildPath } from "./prefs";

const execFileP = promisify(execFile);

export interface CompressMeta {
  backend: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  ratio: number;
}

export interface CompressResponse {
  output: string;
  meta: CompressMeta;
}

export interface BackendInfo {
  id: string;
  model: string;
  ok: boolean | null;
}

export interface StatRow {
  backend: string;
  count: number;
  avg_ratio: number;
  p50_ms: number;
  p95_ms: number;
  in_tokens: number;
  out_tokens: number;
}

export interface CheckRow {
  id: string;
  ok: boolean;
  model: string;
}

export class CliError extends Error {
  constructor(
    message: string,
    public stderr: string,
    public code: number | null,
  ) {
    super(message);
  }
}

async function run(
  args: string[],
  opts: { input?: string; timeoutMs?: number } = {},
): Promise<string> {
  const p = prefs();
  const env = { ...process.env, PATH: buildPath(p.extraPath) };
  try {
    const { stdout } = await execFileP(p.cliPath, args, {
      env,
      timeout: opts.timeoutMs ?? 90_000,
      maxBuffer: 8 * 1024 * 1024,
      input: opts.input,
    });
    return stdout;
  } catch (e: unknown) {
    const err = e as { stderr?: string; code?: number; message?: string };
    throw new CliError(
      err.message || "CLI failed",
      err.stderr || "",
      err.code ?? null,
    );
  }
}

export async function compress(
  backend: string,
  text: string,
): Promise<CompressResponse> {
  const stdout = await run(["compress", backend, "--json"], { input: text });
  return JSON.parse(stdout.trim());
}

export async function listBackends(): Promise<BackendInfo[]> {
  const stdout = await run(["list-backends", "--json"]);
  return JSON.parse(stdout.trim());
}

export async function checkAll(): Promise<CheckRow[]> {
  const stdout = await run(["check", "--json"], { timeoutMs: 5_000 });
  return JSON.parse(stdout.trim());
}

export async function stats(): Promise<StatRow[]> {
  const stdout = await run(["stats", "--json"]);
  return JSON.parse(stdout.trim());
}
