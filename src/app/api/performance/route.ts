import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dailyHistory } from "@/lib/marketdata";
import { computePerformance, Lot } from "@/lib/finance";

export async function GET(req: Request) {
  const session = await auth();
  const id = (session?.user as any)?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const bench = new URL(req.url).searchParams.get("bench") || "SPY";

  const holdings = await prisma.holding.findMany({ where: { userId: id } });
  if (holdings.length === 0) return NextResponse.json({ empty: true });

  const lots: Lot[] = holdings.map((h) => ({
    ticker: h.ticker, shares: h.shares, buyPrice: h.buyPrice,
    buyDate: h.buyDate.toISOString().slice(0, 10),
  }));
  const start = lots.map((l) => l.buyDate).sort()[0];
  let prices;
  try {
    prices = await dailyHistory([...lots.map((l) => l.ticker), bench], start);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Market data fetch failed" }, { status: 502 });
  }
  const result = computePerformance(lots, prices, bench);
  return NextResponse.json(result);
}
