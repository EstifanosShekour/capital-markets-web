import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Row, Cutoffs, passes, addScores } from "@/lib/screener";

export const dynamic = "force-dynamic";

// Reads from the market_snapshot table populated once a day by
// scripts/fetch_market_data.py (see .github/workflows/market-snapshot.yml),
// since FMP's Starter plan no longer exposes index-constituent lists.
export async function GET(req: Request) {
  const session = await auth();
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const drop = Number(sp.get("drop") ?? 20);
  const cut: Cutoffs = {
    maxPe: numOrNull(sp.get("maxPe")), maxPeg: numOrNull(sp.get("maxPeg")),
    minRoe: numOrNull(sp.get("minRoe")), maxDe: numOrNull(sp.get("maxDe")),
    minOpMargin: numOrNull(sp.get("minOpMargin")),
  };

  const snapshot = await prisma.marketSnapshot.findMany();
  if (snapshot.length === 0) {
    return NextResponse.json(
      { error: "No market data yet — the daily snapshot job hasn't run." },
      { status: 502 }
    );
  }

  const dips: Row[] = snapshot
    .filter((r) => r.pctFromHigh != null && r.pctFromHigh <= -drop)
    .map((r) => ({
      symbol: r.symbol, name: r.name, sector: r.sector,
      pctFromHigh: r.pctFromHigh as number, price: r.price, marketCap: r.marketCap ?? 0,
      pe: r.pe, peg: r.peg, roe: r.roe, de: r.de, opMargin: r.opMargin,
    }))
    .sort((a, b) => a.pctFromHigh - b.pctFromHigh); // deepest first

  const filtered = dips.filter((r) => passes(r, cut));
  const scored = addScores(filtered).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const asOf = snapshot.reduce<Date | null>(
    (max, r) => (!max || r.updatedAt > max ? r.updatedAt : max), null
  );
  return NextResponse.json({ scanned: snapshot.length, dips: dips.length, results: scored, asOf });
}

const numOrNull = (s: string | null) => (s == null || s === "" || s === "none" ? null : Number(s));
