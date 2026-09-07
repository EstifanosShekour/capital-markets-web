# Capital Markets Project — Web App (Next.js on Vercel)

Professional full-stack version: Next.js (App Router) + Auth.js + Prisma + Postgres,
deployable on Vercel. This first slice covers **auth, database, per-user holdings, and
performance tracking**. Screener and 10-Q analysis are the next slice.

## Stack
- Next.js 14 + React + TypeScript + Tailwind
- Auth.js (credentials, bcrypt, JWT sessions)
- Prisma ORM + Postgres (Neon free tier)
- Recharts for charts
- Market data: Financial Modeling Prep (free API key)

## Local setup
1. Install Node 18+ and run: `npm install`
2. Copy `.env.example` to `.env` and fill in the values (see below).
3. Create the database tables: `npx prisma db push`
4. Run it: `npm run dev` → open http://localhost:3000

## Environment variables
- `DATABASE_URL` — Postgres connection string (create a free DB at https://neon.tech)
- `AUTH_SECRET` — any long random string (`openssl rand -base64 32`)
- `FMP_API_KEY` — key from https://financialmodelingprep.com (Starter plan or above; the free
  tier no longer exposes single-symbol quotes/history used for holdings pricing and performance)
- `ANTHROPIC_API_KEY` — for the 10-Q analysis slice
- `SEC_USER_AGENT` — required by SEC EDGAR for 10-Q analysis, format: `"Your Name your@email.com"`

## Screener data (daily snapshot job)
The Screener reads from a `market_snapshot` table instead of calling FMP live, since FMP's
plans no longer expose index-constituent lists or batch quotes. `.github/workflows/market-snapshot.yml`
runs `scripts/fetch_market_data.py` daily (weekdays, 22:00 UTC) to scrape the current S&P 500
roster from Wikipedia, enrich each symbol via `yfinance`, and upsert the results.

To enable it on a fork/new repo: add `DATABASE_URL` as a GitHub Actions repo secret
(Settings → Secrets and variables → Actions), or trigger it manually via the Actions tab
("Market snapshot" → Run workflow). Run `python scripts/fetch_market_data.py` locally
(with `DATABASE_URL` set) to seed the table immediately.

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. On vercel.com → New Project → import the repo.
3. Add the same environment variables in Vercel → Project → Settings → Environment Variables.
4. Deploy. After the first deploy, run `npx prisma db push` locally against the same
   `DATABASE_URL` (or add it as a build step) so the tables exist.

## Notes / honesty
- Suitable for you + a few known users. To open to the public you'd add email
  verification, rate limiting, and stricter secret handling.
- Market data on free tiers is rate-limited; heavy use may need a paid plan.
- NOT FINANCIAL ADVICE.
