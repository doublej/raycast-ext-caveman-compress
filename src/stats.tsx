import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { stats, type StatRow, CliError } from "./lib/cli";

function ratioColor(r: number): Color {
  if (r < 0.5) return Color.Green;
  if (r < 0.8) return Color.Yellow;
  if (r <= 1) return Color.Orange;
  return Color.Red;
}

export default function Command() {
  const [rows, setRows] = useState<StatRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const r = await stats();
      r.sort((a, b) => a.avg_ratio - b.avg_ratio);
      setRows(r);
    } catch (e) {
      const err = e as CliError;
      setError((err.stderr || err.message).slice(0, 300));
      setRows([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List isLoading={rows === null}>
      {error && (
        <List.Item
          title="Error loading stats"
          subtitle={error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      )}
      {rows?.length === 0 && !error && (
        <List.EmptyView
          title="No jobs logged yet"
          description="Run Compress Selection first."
        />
      )}
      {rows?.map((r) => {
        const pct = (r.avg_ratio * 100).toFixed(0);
        return (
          <List.Item
            key={r.backend}
            title={r.backend}
            subtitle={`n=${r.count}  in=${r.in_tokens} out=${r.out_tokens}`}
            accessories={[
              {
                text: { value: `${pct}%`, color: ratioColor(r.avg_ratio) },
                tooltip: "avg ratio",
              },
              { text: `p50 ${(r.p50_ms / 1000).toFixed(1)}s` },
              { text: `p95 ${(r.p95_ms / 1000).toFixed(1)}s` },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={load}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
