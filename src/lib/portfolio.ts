export type AnalyzedRow = { symbol: string; score: number; conviction: number | null };
export type Alloc = { symbol: string; weight: number; score: number | null; conviction: number | null };

function normalize(v: number[]): number[] {
  const lo = Math.min(...v), hi = Math.max(...v);
  return hi === lo ? v.map(() => 1) : v.map((x) => (x - lo) / (hi - lo));
}

function applyCap(weights: number[], cap: number): number[] {
  let w = [...weights];
  for (let iter = 0; iter < 100; iter++) {
    const tot = w.reduce((a, b) => a + b, 0);
    w = w.map((x) => x / tot);
    const over = w.map((x, i) => (x > cap + 1e-9 ? i : -1)).filter((i) => i >= 0);
    if (over.length === 0) return w;
    const excess = over.reduce((a, i) => a + (w[i] - cap), 0);
    over.forEach((i) => (w[i] = cap));
    const free = w.map((_, i) => i).filter((i) => !over.includes(i));
    if (free.length === 0) return w;
    const base = free.reduce((a, i) => a + w[i], 0);
    free.forEach((i) => (w[i] += excess * (base > 0 ? w[i] / base : 1 / free.length)));
  }
  return w;
}

export function buildPortfolio(
  rows: AnalyzedRow[], method: "blended" | "score" | "conviction" | "equal",
  maxWeight: number, minConv: number, cash: number
): Alloc[] {
  const surv = rows.filter((r) => r.conviction != null && r.conviction >= minConv);
  if (surv.length === 0) return [];
  const scores = surv.map((r) => r.score);
  const convs = surv.map((r) => r.conviction as number);
  let raw: number[];
  if (method === "equal") raw = surv.map(() => 1);
  else if (method === "score") raw = scores;
  else if (method === "conviction") raw = convs;
  else {
    const ns = normalize(scores), nc = normalize(convs);
    raw = ns.map((a, i) => (a + nc[i]) / 2 + 1e-6);
  }
  const tot = raw.reduce((a, b) => a + b, 0);
  const w = applyCap(raw.map((x) => x / tot), maxWeight);
  const inv = 1 - cash;
  const alloc: Alloc[] = surv.map((s, i) => ({
    symbol: s.symbol, weight: Math.round(w[i] * inv * 10000) / 100,
    score: Math.round(scores[i] * 10) / 10, conviction: convs[i],
  }));
  alloc.sort((a, b) => b.weight - a.weight);
  if (cash > 0) alloc.push({ symbol: "CASH", weight: Math.round(cash * 10000) / 100, score: null, conviction: null });
  return alloc;
}
