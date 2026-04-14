import { LocalStorage } from "@raycast/api";
import { checkAll, type CheckRow } from "./cli";

const KEY = "health-cache-v1";
const TTL_MS = 30_000;

interface Cached {
  ts: number;
  rows: CheckRow[];
}

export async function getHealth(force = false): Promise<CheckRow[]> {
  if (!force) {
    const raw = await LocalStorage.getItem<string>(KEY);
    if (raw) {
      try {
        const c: Cached = JSON.parse(raw);
        if (Date.now() - c.ts < TTL_MS) return c.rows;
      } catch {
        /* fall through */
      }
    }
  }
  const rows = await checkAll();
  await LocalStorage.setItem(
    KEY,
    JSON.stringify({ ts: Date.now(), rows } satisfies Cached),
  );
  return rows;
}
