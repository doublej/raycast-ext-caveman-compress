import {
  Clipboard,
  LaunchProps,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { compress, CliError } from "./lib/cli";
import { prefs } from "./lib/prefs";
import { captureSelection } from "./lib/selection";

interface Args {
  backend?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Args }>) {
  const p = prefs();
  const arg = props.arguments.backend;
  const backend = !arg || arg === "default" ? p.defaultBackend : arg;

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
    const err = e as CliError;
    const msg = (err.stderr || err.message || "unknown error")
      .trim()
      .split("\n")[0]
      .slice(0, 180);
    await showHUD(`✗ ${backend}: ${msg}`);
  }
}
