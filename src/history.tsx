import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readJobs, type JobRecord } from "./lib/jobs";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ratioColor(r: number): Color {
  if (r < 0.5) return Color.Green;
  if (r < 0.8) return Color.Yellow;
  if (r <= 1) return Color.Orange;
  return Color.Red;
}

export default function Command() {
  const [jobs, setJobs] = useState<JobRecord[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setJobs(readJobs());
  }, []);

  const backends = useMemo(() => {
    if (!jobs) return [];
    return Array.from(new Set(jobs.map((j) => j.backend))).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return filter === "all" ? jobs : jobs.filter((j) => j.backend === filter);
  }, [jobs, filter]);

  return (
    <List
      isLoading={jobs === null}
      searchBarPlaceholder="Search by hash prefix"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter backend"
          onChange={setFilter}
          value={filter}
        >
          <List.Dropdown.Item title="All backends" value="all" />
          {backends.map((b) => (
            <List.Dropdown.Item key={b} title={b} value={b} />
          ))}
        </List.Dropdown>
      }
    >
      {jobs?.length === 0 && (
        <List.EmptyView title="No jobs yet" description="History is empty." />
      )}
      {filtered.map((j, i) => {
        const pct = Math.round(j.ratio * 100);
        return (
          <List.Item
            key={`${j.ts}-${i}`}
            title={`${j.backend}  ·  ${timeAgo(j.ts)}`}
            subtitle={`${j.input_hash}  in=${j.input_tokens} out=${j.output_tokens}`}
            keywords={[j.input_hash, j.backend, j.model]}
            accessories={[
              {
                text: { value: `${pct}%`, color: ratioColor(j.ratio) },
                tooltip: "ratio",
              },
              { text: `${(j.duration_ms / 1000).toFixed(1)}s` },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy JSON Record"
                  content={JSON.stringify(j, null, 2)}
                />
                <Action.CopyToClipboard
                  title="Copy Hash"
                  content={j.input_hash}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => setJobs(readJobs())}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
