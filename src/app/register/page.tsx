"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error || "Registration failed"); return; }
    router.push("/login");
  }
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl">📊</div>
          <h1 className="text-2xl font-bold mt-2">Create your account</h1>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Name"
            value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Email" type="email"
            value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Password (8+ chars)"
            type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-accent text-white font-semibold py-2 disabled:opacity-60">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          Have an account? <Link href="/login" className="text-accent font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
