import Link from "next/link";
export default function Overview() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="text-slate-500 mt-1">Your private research workspace.</p>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <Link href="/dashboard/holdings" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-accent">
          <div className="text-lg font-semibold">Holdings →</div>
          <p className="text-sm text-slate-500 mt-1">Record what you own. Add, top up, or sell positions.</p>
        </Link>
        <Link href="/dashboard/performance" className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-accent">
          <div className="text-lg font-semibold">Performance →</div>
          <p className="text-sm text-slate-500 mt-1">Time-weighted returns, drawdown, and benchmark comparison.</p>
        </Link>
      </div>
      <p className="text-xs text-slate-400 mt-8">
        Not financial advice. A research tool built on third-party data that can be wrong.
      </p>
    </div>
  );
}
