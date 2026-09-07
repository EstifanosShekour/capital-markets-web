"use client";
import { useEffect, useState } from "react";

type H = { id: string; ticker: string; shares: number; buyPrice: number | null; buyDate: string };

export default function Holdings() {
  const [rows, setRows] = useState<H[]>([]);
  const [f, setF] = useState({ ticker: "", shares: "", buyPrice: "", buyDate: "" });
  const [err, setErr] = useState("");
  async function load() {
    const r = await fetch("/api/holdings"); const j = await r.json();
    setRows((j.holdings || []).map((h: any) => ({ ...h, buyDate: h.buyDate.slice(0, 10) })));
  }
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const body = {
      ticker: f.ticker.toUpperCase(), shares: parseFloat(f.shares),
      buyPrice: f.buyPrice ? parseFloat(f.buyPrice) : null, buyDate: f.buyDate,
    };
    const r = await fetch("/api/holdings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setErr(j.error || "Failed to add"); return; }
    setF({ ticker: "", shares: "", buyPrice: "", buyDate: "" }); load();
  }
  async function del(id: string) { await fetch(`/api/holdings?id=${id}`, { method: "DELETE" }); load(); }

  return (
    <div>
      <h1 className="text-2xl font-bold">Holdings</h1>
      <p className="text-slate-500 mt-1">Add a row to buy, another for the same ticker to top up, delete to sell.</p>

      <form onSubmit={add} className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white border border-slate-200 rounded-2xl p-4">
        <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Ticker"
          value={f.ticker} onChange={(e) => setF({ ...f, ticker: e.target.value })} required />
        <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Shares" type="number" step="any"
          value={f.shares} onChange={(e) => setF({ ...f, shares: e.target.value })} required />
        <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Buy price (optional)" type="number" step="any"
          value={f.buyPrice} onChange={(e) => setF({ ...f, buyPrice: e.target.value })} />
        <input className="rounded-lg border border-slate-300 px-3 py-2" type="date"
          value={f.buyDate} onChange={(e) => setF({ ...f, buyDate: e.target.value })} required />
        <button className="rounded-lg bg-accent text-white font-semibold">Add</button>
      </form>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="text-left p-3">Ticker</th><th className="text-right p-3">Shares</th>
            <th className="text-right p-3">Buy price</th><th className="text-left p-3">Buy date</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-slate-400 text-center">No holdings yet.</td></tr>}
            {rows.map((h) => (
              <tr key={h.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{h.ticker}</td>
                <td className="p-3 text-right">{h.shares}</td>
                <td className="p-3 text-right">{h.buyPrice ?? "—"}</td>
                <td className="p-3">{h.buyDate}</td>
                <td className="p-3 text-right">
                  <button onClick={() => del(h.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
