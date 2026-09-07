import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function uid() {
  const session = await auth();
  return (session?.user as any)?.id as string | undefined;
}

export async function GET() {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const holdings = await prisma.holding.findMany({ where: { userId: id }, orderBy: { buyDate: "asc" } });
  return NextResponse.json({ holdings });
}

const NewHolding = z.object({
  ticker: z.string().min(1).max(10),
  shares: z.number().positive(),
  buyPrice: z.number().positive().nullable().optional(),
  buyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = NewHolding.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
  const h = await prisma.holding.create({
    data: {
      userId: id, ticker: p.data.ticker.toUpperCase(), shares: p.data.shares,
      buyPrice: p.data.buyPrice ?? null, buyDate: new Date(p.data.buyDate),
    },
  });
  return NextResponse.json({ holding: h });
}

export async function DELETE(req: Request) {
  const id = await uid();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const hid = searchParams.get("id");
  if (!hid) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.holding.deleteMany({ where: { id: hid, userId: id } }); // scoped to owner
  return NextResponse.json({ ok: true });
}
