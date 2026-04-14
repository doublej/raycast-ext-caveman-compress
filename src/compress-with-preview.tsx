import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  compress,
  type CompressResponse,
  CliError,
  type BackendInfo,
} from "./lib/cli";
import { getHealth } from "./lib/health";
import { listBackends } from "./lib/cli";
import { prefs } from "./lib/prefs";
import { captureSelection } from "./lib/selection";

const BACKEND_ORDER = [
  "claude",
  "codex",
  "opencode",
  "ollama-local",
  "nlp-local",
];

function healthIcon(ok: boolean | null) {
  if (ok === true) return { source: Icon.CircleFilled, tintColor: Color.Green };
  if (ok === false) return { source: Icon.CircleFilled, tintColor: Color.Red };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

export default function Command() {
  const p = prefs();
  const { push } = useNavigation();
  const [text, setText] = useState<string>("");
  const [backend, setBackend] = useState<string>(p.defaultBackend);
  const [available, setAvailable] = useState<BackendInfo[]>([]);
  const [healthMap, setHealthMap] = useState<Map<string, boolean | null>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sel = await captureSelection();
        setText(sel);
      } catch {
        /* ignore */
      }
      try {
        const list = await listBackends();
        setAvailable(list);
      } catch {
        setAvailable(BACKEND_ORDER.map((id) => ({ id, model: "", ok: null })));
      }
      try {
        const h = await getHealth();
        setHealthMap(new Map(h.map((r) => [r.id, r.ok])));
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  async function submit(values: { backend: string; text: string }) {
    if (!values.text.trim()) {
      await showHUD("No text to compress");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Compressing via ${values.backend}…`,
    });
    try {
      const res = await compress(values.backend, values.text);
      await toast.hide();
      push(<Result res={res} sourceText={values.text} />);
    } catch (e) {
      await toast.hide();
      const err = e as CliError;
      const msg = (err.stderr || err.message).trim().slice(0, 200);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: msg,
      });
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Compress"
            icon={Icon.Wand}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Input"
        value={text}
        onChange={setText}
        placeholder="Selected text appears here…"
      />
      <Form.Dropdown
        id="backend"
        title="Backend"
        value={backend}
        onChange={setBackend}
      >
        {available.map((b) => (
          <Form.Dropdown.Item
            key={b.id}
            value={b.id}
            title={b.model ? `${b.id}  (${b.model})` : b.id}
            icon={healthIcon(healthMap.get(b.id) ?? b.ok)}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text={`${text.length} chars (max 50,000)`} />
    </Form>
  );
}

function Result({
  res,
  sourceText,
}: {
  res: CompressResponse;
  sourceText: string;
}) {
  const { pop } = useNavigation();
  const pct = (res.meta.ratio * 100).toFixed(0);
  const md = [
    `## Compressed (${pct}% of original)`,
    "",
    "```",
    res.output,
    "```",
    "",
    `**Backend:** ${res.meta.backend} · **Model:** ${res.meta.model}`,
    `**Tokens:** ${res.meta.input_tokens} → ${res.meta.output_tokens}`,
    `**Duration:** ${res.meta.duration_ms} ms`,
  ].join("\n");

  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action
            title="Paste"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.paste(res.output);
              await showHUD("Pasted");
              pop();
            }}
          />
          <Action.CopyToClipboard
            title="Copy"
            content={res.output}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Push
            title="Retry with Different Backend"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            target={<RetryPicker sourceText={sourceText} />}
          />
        </ActionPanel>
      }
    />
  );
}

function RetryPicker({ sourceText }: { sourceText: string }) {
  const { push, pop } = useNavigation();
  const [available, setAvailable] = useState<BackendInfo[]>([]);

  useEffect(() => {
    listBackends()
      .then(setAvailable)
      .catch(() =>
        setAvailable(BACKEND_ORDER.map((id) => ({ id, model: "", ok: null }))),
      );
  }, []);

  async function pick(backend: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Compressing via ${backend}…`,
    });
    try {
      const res = await compress(backend, sourceText);
      await toast.hide();
      pop();
      push(<Result res={res} sourceText={sourceText} />);
    } catch (e) {
      await toast.hide();
      const err = e as CliError;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: (err.stderr || err.message).slice(0, 200),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Retry"
            onSubmit={(v: { backend: string }) => pick(v.backend)}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="backend" title="Backend" defaultValue="claude">
        {available.map((b) => (
          <Form.Dropdown.Item
            key={b.id}
            value={b.id}
            title={b.model ? `${b.id}  (${b.model})` : b.id}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
