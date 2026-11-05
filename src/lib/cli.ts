import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { userInfo, homedir } from "node:os";
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
  const uname = userInfo().username;
  const env = {
    ...process.env,
    PATH: buildPath(p.extraPath),
    HOME: process.env.HOME || homedir(),
    USER: process.env.USER || uname,
    LOGNAME: process.env.LOGNAME || uname,
    SHELL: process.env.SHELL || "/bin/zsh",
  };
  const started = Date.now();
  try {
    const { stdout } = await execFileP(p.cliPath, args, {
      env,
      timeout: opts.timeoutMs ?? 600_000,
      maxBuffer: 8 * 1024 * 1024,
      input: opts.input,
    });
    return stdout;
  } catch (e: unknown) {
    const err = e as {
      stderr?: string;
      stdout?: string;
      code?: number;
      signal?: string;
      killed?: boolean;
      message?: string;
    };
    const elapsed = Date.now() - started;
    const extras: string[] = [`elapsed_ms=${elapsed}`, `argv=${args.join(" ")}`];
    if (err.killed) extras.push("killed=true");
    if (err.signal) extras.push(`signal=${err.signal}`);
    if (err.stdout) extras.push(`stdout=${err.stdout.slice(0, 500)}`);
    const stderr =
      (err.stderr || "") + (extras.length ? "\n" + extras.join(" ") : "");
    throw new CliError(err.message || "CLI failed", stderr, err.code ?? null);
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
