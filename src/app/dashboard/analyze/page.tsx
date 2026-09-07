"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { buildPortfolio, AnalyzedRow } from "@/lib/portfolio";

type Row = { symbol: string; name?: string; score: number; pctFromHigh?: number; pe?: number|null; peg?: number|null; roe?: number|null };
type Result = Row & { conviction: number | null; analysis?: any; filingUrl?: string; error?: string };

const badge = (v: string) => {
  const c: Record<string, string> = { clean: "bg-green-100 text-green-800", distorted: "bg-amber-100 text-amber-800",
    low: "bg-green-100 text-green-800", medium: "bg-amber-100 text-amber-800", high: "bg-red-100 text-red-800" };
  return `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c[v] || "bg-slate-100 text-slate-700"}`;
};

export default function Analyze() {
  const [source, setSource] = useState<Row[]>([]);
  const [n, setN] = useState(10);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [params, setParams] = useState({ method: "blended", maxWeight: 20, minConv: 5, cash: 0 });
  const [capital, setCapital] = useState(10000);
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem("screenerRows") || "[]"); setSource(s); } catch {}
  }, []);

  async function runAnalysis() {
    const top = [...source].sort((a, b) => b.score - a.score).slice(0, n);
    setResults([]); setProgress({ done: 0, total: top.length }); setMsg("");
    const acc: Result[] = [];
    for (let i = 0; i < top.length; i++) {
      const r = top[i];
      const quant = `%fromHigh=${r.pctFromHigh}, P/E=${r.pe}, PEG=${r.peg}, ROE=${r.roe}, Score=${r.score}`;
      try {
        const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: r.symbol, quant, model }) });
        const j = await res.json();
        acc.push({ ...r, conviction: j.analysis?.fundamental_conviction ?? null, analysis: j.analysis,
          filingUrl: j.filingUrl, error: j.error });
      } catch (e: any) {
        acc.push({ ...r, conviction: null, error: String(e) });
      }
      setResults([...acc]); setProgress({ done: i + 1, total: top.length });
    }
    setProgress(null);
  }

  const analyzedRows: AnalyzedRow[] = results.map((r) => ({ symbol: r.symbol, score: r.score, conviction: r.conviction }));
  const alloc = buildPortfolio(analyzedRows, params.method as any, params.maxWeight / 100, params.minConv, params.cash / 100);

  async function createHoldings() {
    setMsg("");
    const res = await fetch("/api/build-holdings", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allocations: alloc, capital, buyDate }) });
    const j = await res.json();
    setMsg(res.ok ? `Added ${j.added} positions to your ledger. See Holdings / Performance.` : (j.error || "Failed"));
  }

  if (source.length === 0)
    return (<div><h1 className="text-2xl font-bold">Analyze &amp; Build</h1>
      <p className="text-slate-500 mt-2">Run the <Link href="/dashboard/screener" className="text-accent">Screener</Link> first — its results feed this page.</p></div>);

  return (
    <div>
      <h1 className="text-2xl font-bold">Analyze &amp; Build</h1>
      <p className="text-slate-500 mt-1">Reads each stock&apos;s latest 10-Q with Claude, then builds a candidate portfolio.</p>

      <div className="flex flex-wrap gap-3 items-end mt-5 bg-white border border-slate-200 rounded-2xl p-4">
        <label className="text-sm">Analyze top
          <input type="number" min={1} max={source.length} value={n} onChange={(e) => setN(Number(e.target.value))}
            className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1" /></label>
        <label className="text-sm">Model
          <select value={model} onChange={(e) => setModel(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1">
            <option>claude-sonnet-4-6</option><option>claude-opus-4-8</option><option>claude-haiku-4-5-20251001</option>
          </select></label>
        <button onClick={runAnalysis} disabled={!!progress}
          className="rounded-lg bg-accent text-white font-semibold px-4 py-2 disabled:opacity-60">
          {progress ? `Analyzing ${progress.done}/${progress.total}…` : "Analyze 10-Qs"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          {results.map((r) => (
            <details key={r.symbol} className="bg-white border border-slate-200 rounded-2xl p-4">
              <summary className="cursor-pointer font-medium">
                {r.symbol} · conviction {r.conviction ?? "—"}/10 {r.error ? <span className="text-red-600 text-sm">({r.error})</span> : null}
              </summary>
              {r.analysis && (
                <div className="mt-3 text-sm space-y-2">
                  <div>
                    <span className={badge(r.analysis.earnings_quality)}>{r.analysis.earnings_quality} earnings</span>{" "}
                    <span className={badge(r.analysis.balance_sheet_risk)}>{r.analysis.balance_sheet_risk} BS risk</span>{" "}
                    <span className="text-slate-500">growth: {r.analysis.growth_quality} · margins: {r.analysis.margin_trend}</span>
                  </div>
                  <p><b>Why it fell.</b> {r.analysis.likely_drawdown_reason}</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <p><b>Bull.</b> {r.analysis.bull_case}</p>
                    <p><b>Bear.</b> {r.analysis.bear_case}</p>
                  </div>
                  {r.analysis.red_flags?.length > 0 && <p><b>🚩 Red flags.</b> {r.analysis.red_flags.join("; ")}</p>}
                  {r.filingUrl && <a href={r.filingUrl} target="_blank" className="text-accent">Open the 10-Q →</a>}
                </div>
              )}
            </details>
          ))}
        </div>
      )}

      {results.some((r) => r.conviction != null) && (
        <div className="mt-8">
          <h2 className="text-xl font-bold">Build portfolio</h2>
          <div className="flex flex-wrap gap-4 items-end mt-3 bg-white border border-slate-200 rounded-2xl p-4">
            <label className="text-sm">Method
              <select value={params.method} onChange={(e) => setParams({ ...params, method: e.target.value })}
                className="ml-2 rounded-lg border border-slate-300 px-2 py-1">
                <option>blended</option><option>score</option><option>conviction</option><option>equal</option></select></label>
            <label className="text-sm">Max weight %
              <input type="number" value={params.maxWeight} onChange={(e) => setParams({ ...params, maxWeight: Number(e.target.value) })}
                className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1" /></label>
            <label className="text-sm">Min conviction
              <input type="number" min={1} max={10} value={params.minConv} onChange={(e) => setParams({ ...params, minConv: Number(e.target.value) })}
                className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1" /></label>
            <label className="text-sm">Cash %
              <input type="number" value={params.cash} onChange={(e) => setParams({ ...params, cash: Number(e.target.value) })}
                className="ml-2 w-20 rounded-lg border border-slate-300 px-2 py-1" /></label>
          </div>

          {alloc.length > 0 ? (
            <>
              <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500"><tr>
                    <th className="text-left p-3">Symbol</th><th className="text-right p-3">Weight</th>
                    <th className="text-right p-3">Score</th><th className="text-right p-3">Conviction</th></tr></thead>
                  <tbody>{alloc.map((a) => (
                    <tr key={a.symbol} className="border-t border-slate-100">
                      <td className="p-3 font-medium">{a.symbol}</td><td className="p-3 text-right">{a.weight}%</td>
                      <td className="p-3 text-right">{a.score ?? "—"}</td><td className="p-3 text-right">{a.conviction ?? "—"}</td>
                    </tr>))}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-3 items-end mt-4 bg-white border border-slate-200 rounded-2xl p-4">
                <label className="text-sm">Total $
                  <input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))}
                    className="ml-2 w-28 rounded-lg border border-slate-300 px-2 py-1" /></label>
                <label className="text-sm">Buy date
                  <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)}
                    className="ml-2 rounded-lg border border-slate-300 px-2 py-1" /></label>
                <button onClick={createHoldings} className="rounded-lg bg-accent text-white font-semibold px-4 py-2">
                  Add to my holdings
                </button>
              </div>
              {msg && <p className="text-sm mt-2 text-slate-700">{msg}</p>}
            </>
          ) : <p className="text-slate-400 mt-3">No names cleared the conviction floor — lower it.</p>}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-8">Not financial advice. LLM analysis can be wrong — verify against the filing.</p>
    </div>
  );
}
