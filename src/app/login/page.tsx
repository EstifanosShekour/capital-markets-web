"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setErr("Incorrect email or password.");
    else router.push("/dashboard");
  }
  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl">📊</div>
          <h1 className="text-2xl font-bold mt-2">Capital Markets Project</h1>
          <p className="text-slate-500 text-sm">Sign in to your workspace</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Email"
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Password"
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-accent text-white font-semibold py-2 disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          No account? <Link href="/register" className="text-accent font-medium">Create one</Link>
        </p>
      </div>
    </main>
  );
}
