import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { useEffect, useState } from "react";
import { compress, CliError, type BackendInfo, listBackends } from "./lib/cli";
import { prefs } from "./lib/prefs";
import { resolveFileTargets } from "./lib/sources";

const BACKEND_ORDER = [
  "claude",
  "codex",
  "opencode",
  "ollama-local",
  "nlp-local",
];

type Status = "pending" | "running" | "done" | "failed";

interface Row {
  path: string;
  size: number;
  status: Status;
  message?: string;
  outPath?: string;
}

function statusIcon(s: Status) {
  if (s === "done") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (s === "failed") return { source: Icon.XMarkCircle, tintColor: Color.Red };
  if (s === "running")
    return { source: Icon.CircleProgress, tintColor: Color.Yellow };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
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

function fileSize(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Command() {
  const p = prefs();
  const [rows, setRows] = useState<Row[]>([]);
  const [backend, setBackend] = useState<string>(p.defaultBackend);
  const [available, setAvailable] = useState<BackendInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [source, setSource] = useState<"finder" | "clipboard" | "none">("none");
  const [finderError, setFinderError] = useState<string | undefined>();
  const [clipboardError, setClipboardError] = useState<string | undefined>();

  async function detect() {
    const det = await resolveFileTargets();
    setRows(
      det.files.map((path) => ({
        path,
        size: fileSize(path),
        status: "pending" as const,
      })),
    );
    setSource(det.source);
    setFinderError(det.finderError);
    setClipboardError(det.clipboardError);
  }

  useEffect(() => {
    (async () => {
      await detect();
      try {
        const list = await listBackends();
        setAvailable(list);
      } catch {
        setAvailable(BACKEND_ORDER.map((id) => ({ id, model: "", ok: null })));
      }
      setLoading(false);
    })();
  }, []);

  async function refresh() {
    setLoading(true);
    await detect();
    setLoading(false);
  }

  async function runAll() {
    if (running || rows.length === 0) return;
    setRunning(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Compressing ${rows.length} file${rows.length === 1 ? "" : "s"}`,
      message: `via ${backend}`,
    });
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r)),
      );
      toast.title = `[${i + 1}/${rows.length}] ${basename(row.path)}`;
      try {
        const text = readFileSync(row.path, "utf8");
        const res = await compress(backend, text);
        const out = siblingPath(row.path);
        writeFileSync(out, res.output, "utf8");
        const pct = Math.round(res.meta.ratio * 100);
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "done",
                  outPath: out,
                  message: `${pct}% · ${res.meta.input_tokens}→${res.meta.output_tokens} tok · ${res.meta.duration_ms}ms`,
                }
              : r,
          ),
        );
      } catch (e) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "failed", message: cliErrMsg(e) } : r,
          ),
        );
      }
    }
    setRunning(false);
    const ok = rowCount("done");
    const fail = rowCount("failed");
    toast.style = fail > 0 ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = `${ok}/${rows.length} compressed`;
    toast.message = fail > 0 ? `${fail} failed` : undefined;
  }

  function rowCount(status: Status): number {
    return rows.filter((r) => r.status === status).length;
  }

  const title =
    rows.length === 0
      ? loading
        ? "Detecting…"
        : "No .md or .txt files detected"
      : `${rows.length} file${rows.length === 1 ? "" : "s"} detected`;

  return (
    <List
      isLoading={loading}
      navigationTitle={title}
      searchBarAccessory={
        <List.Dropdown tooltip="Backend" value={backend} onChange={setBackend}>
          {available.map((b) => (
            <List.Dropdown.Item
              key={b.id}
              value={b.id}
              title={b.model ? `${b.id}  (${b.model})` : b.id}
            />
          ))}
        </List.Dropdown>
      }
    >
      {rows.length === 0 && !loading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No .md or .txt files detected"
          description={[
            finderError ? `Finder: ${finderError}` : "Finder: no selection",
            clipboardError
              ? `Clipboard: ${clipboardError}`
              : "Clipboard: no paths",
            "",
            "If Finder says 'Not authorized' → System Settings › Privacy & Security › Automation → enable Raycast → Finder.",
          ].join("\n")}
          actions={
            <ActionPanel>
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`${rows.length} file${rows.length === 1 ? "" : "s"} · source: ${source}`}
          subtitle={`→ ${backend}`}
        >
          {rows.map((r) => (
            <List.Item
              key={r.path}
              icon={statusIcon(r.status)}
              title={basename(r.path)}
              subtitle={dirname(r.path)}
              accessories={[
                { text: r.message || fmtBytes(r.size) },
                { tag: { value: r.status, color: iconColor(r.status) } },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Compress All Via ${backend}`}
                    icon={Icon.Wand}
                    onAction={runAll}
                  />
                  <Action
                    title="Reload Detection"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                  {r.outPath ? (
                    <Action.ShowInFinder
                      title="Show Output in Finder"
                      path={r.outPath}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  ) : null}
                  <Action.ShowInFinder
                    title="Show Source in Finder"
                    path={r.path}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function iconColor(s: Status): Color {
  if (s === "done") return Color.Green;
  if (s === "failed") return Color.Red;
  if (s === "running") return Color.Yellow;
  return Color.SecondaryText;
}
