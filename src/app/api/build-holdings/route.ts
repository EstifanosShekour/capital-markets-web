import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { batchQuotes } from "@/lib/fmp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const id = (await auth())?.user && ((await auth())!.user as any).id as string;
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { allocations, capital, buyDate } = await req.json().catch(() => ({}));
  if (!Array.isArray(allocations) || !capital || !buyDate)
    return NextResponse.json({ error: "allocations, capital, buyDate required" }, { status: 400 });

  const syms = allocations.filter((a: any) => a.symbol !== "CASH").map((a: any) => a.symbol);
  let quotes: Record<string, any> = {};
  try { quotes = await batchQuotes(syms); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 502 }); }

  const rows = [];
  for (const a of allocations) {
    if (a.symbol === "CASH") continue;
    const px = quotes[a.symbol]?.price;
    if (!px) continue;
    const shares = Math.round(((capital * a.weight) / 100 / px) * 10000) / 10000;
    rows.push({ userId: id, ticker: a.symbol, shares, buyPrice: Math.round(px * 100) / 100, buyDate: new Date(buyDate) });
  }
  if (rows.length === 0) return NextResponse.json({ error: "No prices returned for these symbols." }, { status: 502 });
  await prisma.holding.createMany({ data: rows });
  return NextResponse.json({ added: rows.length });
}
