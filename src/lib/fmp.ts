const FMP = "https://financialmodelingprep.com/stable";

function key(): string {
  const k = process.env.FMP_API_KEY;
  if (!k) throw new Error("FMP_API_KEY is not set");
  return k;
}
async function j(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  return res.json();
}

// FMP's stable API no longer batches multiple symbols into one quote call
// (returns empty on the Starter plan), so this fetches one symbol at a time.
// Returns price, yearHigh, pe, marketCap keyed by symbol.
export async function batchQuotes(symbols: string[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const data = await j(`${FMP}/quote?symbol=${encodeURIComponent(sym)}&apikey=${key()}`);
      if (Array.isArray(data) && data[0]) out[sym] = data[0];
    } catch { /* skip symbol */ }
  }));
  return out;
}
