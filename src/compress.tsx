import {
  Clipboard,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { compress, CliError } from "./lib/cli";
import { prefs } from "./lib/prefs";
import { captureSelection } from "./lib/selection";
import { resolveFileTargets } from "./lib/sources";

interface Args {
  backend?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Args }>) {
  const p = prefs();
  const arg = props.arguments.backend;
  const backend = !arg || arg === "default" ? p.defaultBackend : arg;

  const det = await resolveFileTargets();
  if (det.files.length > 0) {
    await compressFiles(det.files, backend);
    return;
  }

  const selection = (await captureSelection()).trim();
  if (!selection) {
    await showHUD("No text selected");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Compressing via ${backend}…`,
  });

  try {
    const res = await compress(backend, selection);
    if (p.autoPaste) {
      await Clipboard.paste(res.output);
    } else {
      await Clipboard.copy(res.output);
    }
    await toast.hide();
    const pct = Math.round(res.meta.ratio * 100);
    await showHUD(
      `${backend}: ${pct}% (${res.meta.input_tokens}→${res.meta.output_tokens} tok, ${res.meta.duration_ms}ms)`,
    );
  } catch (e) {
    await toast.hide();
    await showHUD(`✗ ${backend}: ${cliErrMsg(e)}`);
  }
}

function siblingPath(file: string): string {
  const ext = extname(file);
  const stem = basename(file, ext);
  return join(dirname(file), `${stem}.caveman${ext}`);
}

function cliErrMsg(e: unknown): string {
  const err = e as CliError;
  return (err.stderr || err.message || "unknown error")
    .trim()
    .split("\n")[0]
    .slice(0, 180);
}

async function compressFiles(files: string[], backend: string) {
  await showHUD(
    `Found ${files.length} file${files.length === 1 ? "" : "s"} → ${backend}: ${files.map((f) => basename(f)).join(", ")}`,
  );
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = basename(file);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `[${i + 1}/${files.length}] ${name}`,
      message: `via ${backend}…`,
    });
    try {
      const text = readFileSync(file, "utf8");
      const res = await compress(backend, text);
      writeFileSync(siblingPath(file), res.output, "utf8");
      ok++;
      await toast.hide();
    } catch (e) {
      fail++;
      await toast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: `✗ ${name}`,
        message: cliErrMsg(e),
      });
    }
  }
  await showHUD(
    `${backend}: ${ok}/${files.length} compressed${fail ? `, ${fail} failed` : ""}`,
  );
}
