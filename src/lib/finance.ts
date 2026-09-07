export type Lot = { ticker: string; shares: number; buyPrice: number | null; buyDate: string };
export type Position = {
  ticker: string; shares: number; cost: number; value: number;
  return: number; weight: number; firstBuy: string;
};
export type PerfResult = {
  dates: string[]; twr: number[]; portfolioValue: number[];
  benchIndex: number[] | null;
  positions: Position[];
  metrics: { twrTotal: number; cagr: number; vol: number; maxDrawdown: number;
             sharpe: number; days: number; totalCost: number; totalValue: number };
};

function businessDays(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// forward-fill a price map onto the date grid
function series(map: Record<string, number>, dates: string[]): number[] {
  const out: number[] = []; let last = NaN;
  for (const dt of dates) { if (map[dt] != null) last = map[dt]; out.push(last); }
  return out;
}
function firstOnAfter(map: Record<string, number>, d: string): number {
  const keys = Object.keys(map).filter((k) => k >= d).sort();
  return keys.length ? map[keys[0]] : NaN;
}

export function computePerformance(
  lots: Lot[], prices: Record<string, Record<string, number>>,
  benchTicker: string | null, rf = 0.04
): PerfResult {
  const start = lots.map((l) => l.buyDate).sort()[0];
  const today = new Date().toISOString().slice(0, 10);
  const dates = businessDays(start, today);
  const n = dates.length;

  const value = new Array(n).fill(0);
  const flows = new Array(n).fill(0);
  const enriched = lots.map((l) => ({
    ...l,
    buyPrice: l.buyPrice && l.buyPrice > 0 ? l.buyPrice
      : (prices[l.ticker] ? firstOnAfter(prices[l.ticker], l.buyDate) : NaN),
  }));

  for (const l of enriched) {
    const pmap = prices[l.ticker]; if (!pmap) continue;
    const px = series(pmap, dates);
    const entryIdx = dates.findIndex((d) => d >= l.buyDate);
    if (entryIdx < 0) continue;
    for (let i = entryIdx; i < n; i++) value[i] += l.shares * px[i];
    flows[entryIdx] += l.shares * px[entryIdx];
  }

  const twr = new Array(n).fill(1);
  for (let i = 1; i < n; i++) {
    const prev = value[i - 1];
    const r = prev > 0 ? (value[i] - flows[i]) / prev - 1 : 0;
    twr[i] = twr[i - 1] * (1 + (isFinite(r) ? r : 0));
  }

  // positions (aggregate lots by ticker, blended cost)
  const posMap: Record<string, Position> = {};
  for (const l of enriched) {
    const pmap = prices[l.ticker]; if (!pmap) continue;
    const last = series(pmap, dates)[n - 1];
    const p = posMap[l.ticker] ?? {
      ticker: l.ticker, shares: 0, cost: 0, value: 0, return: 0, weight: 0, firstBuy: l.buyDate,
    };
    p.shares += l.shares;
    p.cost += l.shares * (isFinite(l.buyPrice as number) ? (l.buyPrice as number) : last);
    if (l.buyDate < p.firstBuy) p.firstBuy = l.buyDate;
    p.value = p.shares * last;
    posMap[l.ticker] = p;
  }
  const totalValue = value[n - 1] || 0;
  const positions = Object.values(posMap).map((p) => ({
    ...p, return: p.cost > 0 ? p.value / p.cost - 1 : 0,
    weight: totalValue > 0 ? p.value / totalValue : 0,
  })).sort((a, b) => b.value - a.value);

  // metrics
  const dailyR: number[] = [];
  for (let i = 1; i < n; i++) if (twr[i - 1] > 0) dailyR.push(twr[i] / twr[i - 1] - 1);
  const mean = dailyR.reduce((a, b) => a + b, 0) / (dailyR.length || 1);
  const variance = dailyR.reduce((a, b) => a + (b - mean) ** 2, 0) / (dailyR.length || 1);
  const vol = Math.sqrt(variance) * Math.sqrt(252);
  const days = Math.max(1, (new Date(dates[n - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000);
  const cagr = Math.pow(twr[n - 1], 365 / days) - 1;
  let peak = -Infinity, maxDd = 0;
  for (const t of twr) { peak = Math.max(peak, t); maxDd = Math.min(maxDd, t / peak - 1); }
  const totalCost = positions.reduce((a, p) => a + p.cost, 0);

  let benchIndex: number[] | null = null;
  if (benchTicker && prices[benchTicker]) {
    const b = series(prices[benchTicker], dates);
    const base = b.find((x) => isFinite(x)) ?? 1;
    benchIndex = b.map((x) => x / base);
  }

  return {
    dates, twr, portfolioValue: value, benchIndex, positions,
    metrics: {
      twrTotal: twr[n - 1] - 1, cagr, vol, maxDrawdown: maxDd,
      sharpe: vol > 0 ? (cagr - rf) / vol : NaN, days: Math.round(days),
      totalCost, totalValue,
    },
  };
}
