// Daily close history from Financial Modeling Prep (stable API).
// Returns { [ticker]: { [YYYY-MM-DD]: close } }.
const FMP = "https://financialmodelingprep.com/stable";

export async function dailyHistory(
  tickers: string[], from: string
): Promise<Record<string, Record<string, number>>> {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not set");
  const out: Record<string, Record<string, number>> = {};
  for (const t of Array.from(new Set(tickers))) {
    try {
      const url = `${FMP}/historical-price-eod/full?symbol=${encodeURIComponent(t)}&from=${from}&apikey=${key}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const hist: any[] = await res.json();
      const map: Record<string, number> = {};
      for (const row of hist) {
        const px = row.adjClose ?? row.close;
        if (typeof px === "number") map[row.date] = px;
      }
      out[t] = map;
    } catch { /* skip ticker */ }
  }
  return out;
}
