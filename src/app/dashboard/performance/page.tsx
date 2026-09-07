"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;
const usd = (x: number) => `$${Math.round(x).toLocaleString()}`;

export default function Performance() {
  const [data, setData] = useState<any>(null);
  const [bench, setBench] = useState("SPY");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function run() {
    setBusy(true); setErr(""); setData(null);
    const r = await fetch(`/api/performance?bench=${bench}`);
    setBusy(false);
    const j = await r.json();
    if (!r.ok) { setErr(j.error || "Failed"); return; }
    if (j.empty) { setErr("No holdings yet — add some on the Holdings page."); return; }
    setData(j);
  }
  const chart = data?.dates?.map((d: string, i: number) => ({
    date: d, Portfolio: (data.twr[i] - 1) * 100,
    [bench]: data.benchIndex ? (data.benchIndex[i] - 1) * 100 : null,
  }));
  const m = data?.metrics;
  return (
    <div>
      <h1 className="text-2xl font-bold">Performance</h1>
      <p className="text-slate-500 mt-1">Time-weighted returns from each position&apos;s own buy date.</p>
      <div className="flex gap-3 items-center mt-4">
        <select className="rounded-lg border border-slate-300 px-3 py-2" value={bench} onChange={(e) => setBench(e.target.value)}>
          <option>SPY</option><option>QQQ</option>
        </select>
        <button onClick={run} disabled={busy} className="rounded-lg bg-accent text-white font-semibold px-4 py-2 disabled:opacity-60">
          {busy ? "Loading…" : "Track performance"}
        </button>
      </div>
      {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

      {m && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <Card label="Current value" value={usd(m.totalValue)} sub={pct(m.totalValue / m.totalCost - 1)} />
            <Card label="Time-weighted" value={pct(m.twrTotal)} />
            <Card label="Max drawdown" value={pct(m.maxDrawdown)} />
            <Card label="Annualized" value={isFinite(m.cagr) ? pct(m.cagr) : "—"} />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-6" style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                <Legend />
                <Line type="monotone" dataKey="Portfolio" stroke="#2563eb" dot={false} strokeWidth={2} />
                {data.benchIndex && <Line type="monotone" dataKey={bench} stroke="#94a3b8" dot={false} strokeDasharray="5 4" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr>
                <th className="text-left p-3">Ticker</th><th className="text-right p-3">Value</th>
                <th className="text-right p-3">Return</th><th className="text-right p-3">Weight</th>
                <th className="text-left p-3">First buy</th></tr></thead>
              <tbody>
                {data.positions.map((p: any) => (
                  <tr key={p.ticker} className="border-t border-slate-100">
                    <td className="p-3 font-medium">{p.ticker}</td>
                    <td className="p-3 text-right">{usd(p.value)}</td>
                    <td className={`p-3 text-right ${p.return >= 0 ? "text-pos" : "text-neg"}`}>{pct(p.return)}</td>
                    <td className="p-3 text-right">{(p.weight * 100).toFixed(1)}%</td>
                    <td className="p-3">{p.firstBuy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-xs text-slate-400 mt-8">Not financial advice. Ignores costs, taxes, slippage.</p>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
