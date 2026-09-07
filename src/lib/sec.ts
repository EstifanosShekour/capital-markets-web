function ua(): string {
  const u = process.env.SEC_USER_AGENT;
  if (!u) throw new Error("SEC_USER_AGENT is not set (SEC requires 'Name email').");
  return u;
}
async function sec(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": ua() }, next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`SEC ${res.status}`);
  return res;
}

let _cik: Record<string, string> | null = null;
export async function cikFor(ticker: string): Promise<string | null> {
  if (!_cik) {
    const data = await (await sec("https://www.sec.gov/files/company_tickers.json")).json();
    _cik = {};
    for (const r of Object.values<any>(data)) _cik[r.ticker.toUpperCase()] = String(r.cik_str).padStart(10, "0");
  }
  return _cik[ticker.toUpperCase()] ?? null;
}

export async function latest10Q(cik10: string): Promise<{ url: string; reportDate: string } | null> {
  const rec = (await (await sec(`https://data.sec.gov/submissions/CIK${cik10}.json`)).json())?.filings?.recent;
  if (!rec) return null;
  for (let i = 0; i < rec.form.length; i++) {
    if (rec.form[i] === "10-Q") {
      const acc = rec.accessionNumber[i].replace(/-/g, "");
      return {
        url: `https://www.sec.gov/Archives/edgar/data/${parseInt(cik10, 10)}/${acc}/${rec.primaryDocument[i]}`,
        reportDate: rec.reportDate[i],
      };
    }
  }
  return null;
}

export async function fetch10QText(url: string, budget = 200_000): Promise<string> {
  const html = await (await sec(url)).text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
  return text.slice(0, budget);
}
