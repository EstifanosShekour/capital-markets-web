"""
Daily market-data snapshot for the Screener.

FMP's free/Starter plan no longer exposes index-constituent lists or batch
quotes, so this pulls the S&P 500 roster from Wikipedia and enriches every
name with yfinance, then upserts the result into the `market_snapshot` table
that /api/screener reads from. Run daily via .github/workflows/market-snapshot.yml.
"""
import io
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
import psycopg2
import psycopg2.extras
import requests
import yfinance as yf

WIKI_SP500 = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
UA = {"User-Agent": "Mozilla/5.0 (compatible; capital-markets-web/1.0)"}
MAX_WORKERS = 8


def sp500_roster() -> dict[str, dict]:
    html = requests.get(WIKI_SP500, headers=UA, timeout=30).text
    table = pd.read_html(io.StringIO(html))[0]
    roster = {}
    for _, row in table.iterrows():
        symbol = str(row["Symbol"]).strip().replace(".", "-")  # yfinance/FMP use hyphens
        roster[symbol] = {
            "name": str(row["Security"]).strip(),
            "sector": str(row["GICS Sector"]).strip(),
        }
    return roster


def fetch_one(symbol: str, meta: dict) -> dict | None:
    try:
        info = yf.Ticker(symbol).get_info()
    except Exception:
        return None

    price = info.get("currentPrice") or info.get("regularMarketPrice")
    year_high = info.get("fiftyTwoWeekHigh")
    if not price or not year_high or year_high <= 0:
        return None

    def num(x):
        return round(float(x), 2) if isinstance(x, (int, float)) else None

    def pct(x):
        return round(float(x) * 100, 1) if isinstance(x, (int, float)) else None

    return {
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName") or meta["name"],
        "sector": info.get("sector") or meta["sector"],
        "price": num(price),
        "year_high": num(year_high),
        "pct_from_high": round((price - year_high) / year_high * 100, 1),
        "market_cap": num(info.get("marketCap")),
        "pe": num(info.get("trailingPE") or info.get("forwardPE")),
        "peg": num(info.get("trailingPegRatio") or info.get("pegRatio")),
        "roe": pct(info.get("returnOnEquity")),
        "de": num(info.get("debtToEquity")),
        "op_margin": pct(info.get("operatingMargins")),
    }


def upsert(rows: list[dict]):
    if not rows:
        return
    cols = ["symbol", "name", "sector", "price", "year_high", "pct_from_high",
            "market_cap", "pe", "peg", "roe", "de", "op_margin"]
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn, conn.cursor() as cur:
            psycopg2.extras.execute_values(
                cur,
                f"""
                INSERT INTO market_snapshot ({", ".join(cols)}, updated_at)
                VALUES %s
                ON CONFLICT (symbol) DO UPDATE SET
                  name = EXCLUDED.name, sector = EXCLUDED.sector, price = EXCLUDED.price,
                  year_high = EXCLUDED.year_high, pct_from_high = EXCLUDED.pct_from_high,
                  market_cap = EXCLUDED.market_cap, pe = EXCLUDED.pe, peg = EXCLUDED.peg,
                  roe = EXCLUDED.roe, de = EXCLUDED.de, op_margin = EXCLUDED.op_margin,
                  updated_at = EXCLUDED.updated_at
                """,
                [tuple(r[c] for c in cols) for r in rows],
                template="(" + ", ".join(["%s"] * len(cols)) + ", now())",
            )
    finally:
        conn.close()


def main():
    roster = sp500_roster()
    print(f"Roster: {len(roster)} S&P 500 symbols", file=sys.stderr)

    rows = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_one, sym, meta): sym for sym, meta in roster.items()}
        for i, fut in enumerate(as_completed(futures), 1):
            sym = futures[fut]
            try:
                row = fut.result()
                if row:
                    rows.append(row)
            except Exception as e:
                print(f"  skip {sym}: {e}", file=sys.stderr)
            if i % 50 == 0:
                print(f"  {i}/{len(roster)} processed", file=sys.stderr)

    print(f"Fetched {len(rows)}/{len(roster)} symbols, upserting…", file=sys.stderr)
    upsert(rows)
    print("Done.", file=sys.stderr)


if __name__ == "__main__":
    main()
