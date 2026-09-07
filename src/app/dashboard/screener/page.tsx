"use client";
import { useState } from "react";

type R = {
  symbol: string; name: string; sector: string; pctFromHigh: number; price: number;
  pe: number | null; peg: number | null; roe: number | null; de: number | null;
  opMargin: number | null; score: number;
};
const f = (x: number | null, s = "") => (x == null ? "—" : `${x}${s}`);

export default function Screener() {
  const [p, setP] = useState({ drop: 20, maxPe: 40, maxPeg: 2, minRoe: 10, maxDe: 200 });
  const [rows, setRows] = useState<R[] | null>(null);
  const [meta, setMeta] = useState<{ scanned: number; dips: number; asOf: string | null } | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");

  async function run() {
    setBusy(true); setErr(""); setRows(null);
    const qs = new URLSearchParams({
      drop: String(p.drop), maxPe: String(p.maxPe), maxPeg: String(p.maxPeg),
      minRoe: String(p.minRoe), maxDe: String(p.maxDe), minOpMargin: "0",
    });
    const res = await fetch(`/api/screener?${qs}`);
    setBusy(false);
    const j = await res.json();
    if (!res.ok) { setErr(j.error || "Failed"); return; }
    setRows(j.results); setMeta({ scanned: j.scanned, dips: j.dips, asOf: j.asOf });
    try { localStorage.setItem("screenerRows", JSON.stringify(j.results)); } catch {}
  }

  const Slider = ({ label, k, min, max, step = 1 }: any) => (
    <div>
      <div className="flex justify-between text-sm"><span className="text-slate-600">{label}</span>
        <span className="font-medium">{(p as any)[k]}</span></div>
      <input type="range" min={min} max={max} step={step} value={(p as any)[k]}
        onChange={(e) => setP({ ...p, [k]: Number(e.target.value) })} className="w-full" />
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Screener</h1>
      <p className="text-slate-500 mt-1">S&amp;P 500 dips that are still cheap and healthy.</p>

      <div className="grid sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-2xl p-5 mt-5">
        <Slider label="Min % below high" k="drop" min={5} max={80} />
        <Slider label="Max P/E" k="maxPe" min={5} max={100} />
        <Slider label="Max PEG" k="maxPeg" min={0.2} max={5} step={0.1} />
        <Slider label="Min ROE %" k="minRoe" min={0} max={40} />
        <Slider label="Max Debt/Equity %" k="maxDe" min={0} max={500} step={10} />
        <div className="flex items-end">
          <button onClick={run} disabled={busy}
            className="w-full rounded-lg bg-accent text-white font-semibold py-2 disabled:opacity-60">
            {busy ? "Scanning…" : "Run screener"}
          </button>
        </div>
      </div>
      {busy && <p className="text-sm text-slate-500 mt-3">Scanning the latest daily snapshot…</p>}
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
      {meta && (
        <p className="text-sm text-slate-500 mt-3">
          Scanned {meta.scanned} tickers · {meta.dips} below your dip threshold · showing {rows?.length ?? 0} that passed all cutoffs.
          {meta.asOf && ` As of ${new Date(meta.asOf).toLocaleString()}.`}
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr>
              {["Symbol","Name","% from high","P/E","PEG","ROE","D/E","Op mgn","Score"].map((h) =>
                <th key={h} className="text-left p-3 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{r.symbol}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{r.name}</td>
                  <td className="p-3 text-neg">{r.pctFromHigh}%</td>
                  <td className="p-3">{f(r.pe)}</td>
                  <td className="p-3">{f(r.peg)}</td>
                  <td className="p-3">{f(r.roe, "%")}</td>
                  <td className="p-3">{f(r.de)}</td>
                  <td className="p-3">{f(r.opMargin, "%")}</td>
                  <td className="p-3 font-semibold">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && rows.length > 0 && (
        <a href="/dashboard/analyze" className="inline-block mt-4 text-accent font-medium">Analyze these with Claude →</a>
      )}
      {rows && rows.length === 0 && <p className="text-slate-400 mt-4">Nothing passed — loosen the cutoffs.</p>}
      <p className="text-xs text-slate-400 mt-8">Not financial advice. Data refreshes once daily.</p>
    </div>
  );
}
