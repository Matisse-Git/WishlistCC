# WishListCC

A personal wishlist tracker. Paste a product URL, it best-effort scrapes the title/price/image, converts prices to your base currency using free exchange rates, and tracks a savings goal against your wishlist total. Built to run entirely on free tiers — Postgres (e.g. Neon's free tier) + Vercel, no paid scraping or currency APIs required.

## Features

- Paste a URL → server-side scrape (Open Graph, Twitter Card, JSON-LD `Product`, microdata, meta tags, `<title>` fallback) prefills an editable form. Extraction failure never blocks adding the item — you can always fill in details by hand.
- Labels, priority, notes, search/filter/sort (all synced to the URL so views are shareable).
- Dashboard with active-wishlist total, missing-price count, bought total, and a savings-goal progress bar.
- Mark items bought → moves them to a separate Bought view with spend totals (all-time and this month).
- Currency conversion to a configured base currency, using cached exchange rates (refreshed every 24h, degrades gracefully to stale cache or manual entry if the rate API is unreachable).
- Decimal-safe money handling throughout (no float drift in totals).
- Optional single-password protection for public deployments (off by default).

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Prisma ORM 7 · PostgreSQL · Zod · Cheerio · lucide-react · Vitest

## Setup

```bash
npm install
cp .env.example .env   # set DATABASE_URL to a Postgres connection string
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A free Postgres instance (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com)) works for local dev too — no local Postgres install required. Currency conversion calls a free public API on demand; everything else works without network access.

### Environment variables

See `.env.example`. All are optional except `DATABASE_URL`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | A `postgresql://...` connection string. |
| `CURRENCY_API_KEY` | no | Only used if you configure a paid/keyed exchange-rate provider. The default (`open.er-api.com`) needs no key. |
| `APP_URL` | no | Informational; not required for the app to function locally. |
| `APP_PASSWORD` | no | If set, gates the whole app behind a single shared password (see below). Leave unset for local-only use. |

### Database migrations

```bash
npx prisma migrate dev --name <description>   # create + apply a migration during development
npx prisma migrate deploy                      # apply pending migrations in production/CI
npx prisma studio                               # browse the database in a GUI
```

Prisma Client is generated to `src/generated/prisma` (not `node_modules`) — this is Prisma 7's default. Re-run `npx prisma generate` after any schema change if you're not using `migrate dev` (which does it for you).

### Running tests

```bash
npm run test
```

Covers price-string parsing (symbols, comma/dot decimal ambiguity, thousands separators), currency-code normalization, JSON-LD extraction (including nested arrays and `@graph`), domain/store-name resolution, SSRF host blocking, and currency conversion math.

## How the URL preview / scraper works

`POST /api/items/preview` fetches the given URL server-side (browser `fetch` can't reliably do this due to CORS) and extracts, in priority order:

1. JSON-LD `Product` / `ProductGroup` / `IndividualProduct` (`offers.price`, or the low end of a `lowPrice`/`highPrice` range)
2. `product:price:amount` / `product:price:currency` meta tags
3. Microdata (`itemprop="price"`, etc.)
4. Open Graph / Twitter Card tags for title, description, image
5. `<title>` and first plausible `<img>` as a last resort

Price strings like `"$19.99"`, `"19,99 €"`, `"€1,234.56"`, and `"1 234,56 EUR"` are normalized into a decimal amount + ISO currency code; explicit currency codes/metadata always win over symbol guessing.

**Safety**: only `http(s)` URLs are fetched; requests to `localhost`, loopback, and RFC1918/link-local address ranges are rejected before any request is made. Redirects are followed manually (each hop re-validated against the same block-list) up to 5 hops, with an 8–10s timeout and a 3MB response cap. The preview endpoint is rate-limited (10 requests/minute per client) in-memory. None of this bypasses logins, paywalls, or bot detection — sites that block scrapers will simply fail to preview, and you fill in the details by hand.

## How currency conversion works

- Rates are fetched from [open.er-api.com](https://www.exchangerate-api.com/docs/free) (no API key needed) with your configured base currency, cached in the `ExchangeRateCache` table, and reused for 24 hours.
- Converting an item's price is `originalAmount / rate[originalCurrency]` — one daily fetch (keyed by your base currency) covers conversions from every currency an item might be priced in.
- If the API is unreachable, the app falls back to the most recent cached rates (marking them stale) rather than failing; if there's no cache at all, the item saves with `conversionStatus: "missing_rate"` and is excluded from totals (with a "N missing price" note on the dashboard) rather than blocking the save.
- Manually overriding an item's converted price sets `conversionStatus: "manual"` and is left untouched by future rate refreshes / base-currency changes until you clear the override.

## Deploying

**Vercel:** connect the repo (or run `vercel`), set the environment variables below in the project settings, then deploy. `postinstall` runs `prisma generate` automatically; run `npx prisma migrate deploy` (with `DATABASE_URL` pointed at prod) once to create the tables before the first request hits the DB.

**Local / self-hosted:** `npm run build && npm start` behind whatever process manager you like, pointed at any reachable Postgres instance.

A free Postgres tier on [Neon](https://neon.tech) or [Supabase](https://supabase.com) is enough to run this app.

### Optional password protection

Unset by default — the app runs with no login. If you deploy it somewhere reachable by others, set `APP_PASSWORD` and every route (pages and API) requires it via a simple cookie-based login at `/login`. There's no per-user accounts, sessions, or password reset — it's a single shared secret for a single-user app, not real multi-user auth.

## Known limitations

- **Scraping is best-effort.** Sites with aggressive bot detection (Amazon in particular, plus many others) will frequently fail to return usable data or will return partial data (e.g. no price) even though the fetch itself succeeds — Amazon especially serves different markup to bots and often omits price in the initial HTML. This is intentional: the app does not attempt to bypass anti-bot measures, CAPTCHAs, or login walls. When extraction fails, fill in the details manually — this always works regardless of the source site.
- **No JS-rendered content.** The scraper reads static HTML only; sites that render price/title via client-side JavaScript won't extract those fields.
- **Rate limiting is in-memory and per-process** — fine for a single-user deployment, but doesn't coordinate across multiple server instances and resets on restart.
- **`APP_PASSWORD` is a single shared secret**, not an accounts system — don't use it for anything beyond keeping a personal instance private.

## Project structure

```
prisma/schema.prisma       Data model (Setting, Label, Item, ItemLabel, ExchangeRateCache)
src/lib/                   Framework-agnostic logic: money, currency, scraper, validation, db
src/app/api/                Route handlers (items, labels, settings, rates, auth)
src/app/{,items,bought,settings,login}/  Pages
src/components/            UI components (client components for interactivity, forms, modals)
src/lib/__tests__/         Vitest unit tests
```
