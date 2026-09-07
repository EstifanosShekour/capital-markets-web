import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { email, name, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email: email.toLowerCase(), name, password: hash } });
  return NextResponse.json({ ok: true });
}
