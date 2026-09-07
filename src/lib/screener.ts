export type Row = {
  symbol: string; name: string; sector: string;
  pctFromHigh: number; price: number; marketCap: number;
  pe: number | null; peg: number | null; roe: number | null;
  de: number | null; opMargin: number | null; score?: number;
};
export type Cutoffs = {
  maxPe: number | null; maxPeg: number | null; minRoe: number | null;
  maxDe: number | null; minOpMargin: number | null;
};

const FILTERS: [keyof Row, "min" | "max", keyof Cutoffs][] = [
  ["pe", "max", "maxPe"], ["peg", "max", "maxPeg"], ["roe", "min", "minRoe"],
  ["de", "max", "maxDe"], ["opMargin", "min", "minOpMargin"],
];

export function passes(r: Row, c: Cutoffs): boolean {
  for (const [col, dir, key] of FILTERS) {
    const cut = c[key];
    if (cut == null) continue;
    const v = r[col] as number | null;
    if (v == null) return false;            // active cutoff + missing metric -> exclude
    if (dir === "min" && v < cut) return false;
    if (dir === "max" && v > cut) return false;
  }
  return true;
}

const SCORE: [keyof Row, boolean][] = [
  ["peg", false], ["pe", false], ["roe", true], ["de", false], ["opMargin", true],
];

// rank-percentile composite (0-100), same method as the Python version
export function addScores(rows: Row[]): Row[] {
  if (rows.length === 0) return rows;
  const pcts: Record<string, number[]> = {};
  for (const [col, higherBetter] of SCORE) {
    const vals = rows.map((r) => r[col] as number | null);
    const idx = rows.map((_, i) => i).filter((i) => vals[i] != null);
    idx.sort((a, b) => (higherBetter
      ? (vals[b]! - vals[a]!) : (vals[a]! - vals[b]!)));  // best first
    const p = new Array(rows.length).fill(0.5);           // missing -> neutral
    idx.forEach((rowIdx, rank) => { p[rowIdx] = 1 - rank / Math.max(1, idx.length - 1); });
    pcts[col as string] = p;
  }
  return rows.map((r, i) => {
    const parts = SCORE.map(([col]) => pcts[col as string][i]);
    return { ...r, score: Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 1000) / 10 };
  });
}
