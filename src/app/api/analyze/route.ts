import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cikFor, latest10Q, fetch10QText } from "@/lib/sec";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SYSTEM =
  "You are a skeptical equity analyst reading 10-Q filings to find what headline numbers hide " +
  "(one-off items distorting earnings, inorganic growth, balance-sheet fragility, deterioration the " +
  "trailing ratios miss). You never give buy/sell advice, never invent figures, and flag truncation.";

export async function POST(req: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });

  const { symbol, quant, model } = await req.json().catch(() => ({}));
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    const cik = await cikFor(symbol);
    if (!cik) return NextResponse.json({ symbol, error: "no CIK / not in SEC list" }, { status: 200 });
    const filing = await latest10Q(cik);
    if (!filing) return NextResponse.json({ symbol, error: "no 10-Q on file" }, { status: 200 });
    const text = await fetch10QText(filing.url);

    const prompt =
      `Analyze this 10-Q excerpt for ${symbol}. Screener figures (market data, not the filing): ${quant || "n/a"}.\n\n` +
      "Assess earnings quality (clean vs distorted by one-offs), organic vs acquisition growth, " +
      "balance-sheet risk, margin trend, the likely reason for the sell-off, and key risks. " +
      "Respond with ONLY JSON using keys: earnings_quality ('clean'|'distorted'), earnings_quality_note, " +
      "growth_quality, balance_sheet_risk ('low'|'medium'|'high'), margin_trend, likely_drawdown_reason, " +
      "key_risks (array), bull_case, bear_case, red_flags (array), fundamental_conviction (int 1-10)." +
      `\n\nFILING:\n${text}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || "claude-sonnet-4-6", max_tokens: 4000,
        system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return NextResponse.json({ symbol, error: `Anthropic ${res.status}` }, { status: 200 });
    const data = await res.json();
    let raw = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    raw = raw.replace(/^```(?:json)?|```$/gm, "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(m ? m[0] : raw);
    return NextResponse.json({ symbol, filingUrl: filing.url, reportDate: filing.reportDate, analysis });
  } catch (e: any) {
    return NextResponse.json({ symbol, error: e.message || "analysis failed" }, { status: 200 });
  }
}
