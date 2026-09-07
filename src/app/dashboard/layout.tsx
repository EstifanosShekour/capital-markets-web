import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = session.user.name || session.user.email;
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-ink text-slate-200 flex flex-col p-5">
        <div className="text-lg font-semibold mb-1">📊 Capital Markets</div>
        <div className="text-xs text-slate-400 mb-6">Signed in as {name}</div>
        <nav className="flex flex-col gap-1 text-sm">
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/dashboard">Overview</Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/dashboard/holdings">Holdings</Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/dashboard/performance">Performance</Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/dashboard/screener">Screener</Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/dashboard/analyze">Analyze &amp; Build</Link>
        </nav>
        <div className="mt-auto pt-6">
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Log out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 max-w-5xl">{children}</main>
    </div>
  );
}
