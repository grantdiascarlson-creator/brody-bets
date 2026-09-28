# Brody Bets

A personal project that prices NBA player props and compares them with sportsbook lines. Live at [brodybets.com](https://brodybets.com).

I built this to learn full-stack development on top of my own pricing model. A Python pipeline projects player stats, converts the projections into probabilities, and calculates the expected value of each prop against current market prices. This site displays the results and tracks a record of picks.

It isn't a commercial product. Access is by approval, and the Stripe integration was built as part of learning a complete auth and payments flow.

## How it fits together

The project is two separate systems joined by Supabase:

| Piece | Repo | What it does |
|---|---|---|
| Data pipeline | `prop_ev_pipeline` (Python, private) | Pulls odds, projects player stats, calculates EV, uploads results to Supabase |
| Website | `brody-bets` (this repo, Next.js) | Reads from Supabase and shows the data to approved users |

```
Odds data ──► Python pipeline ──► Supabase (Postgres + Auth) ◄── Next.js site on Vercel
```

The pipeline writes and the site reads. They never talk to each other directly, so one can go down without breaking the other.

## Stack

- **Next.js** (App Router), deployed on **Vercel**
- **Supabase** for Postgres, auth (email/password + Google), and row-level security
- **Stripe** subscription flow, built as a working example of gated access

## Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with a blurred preview of the EV table |
| `/login`, `/signup` | Public | Email/password and Google sign-in |
| `/pending` | Signed in | Shown to new accounts awaiting approval |
| `/ev` | Approved users | EV table, sortable and filterable, with an EV-only toggle |
| `/lines` | Approved users | Side-by-side lines across bookmakers |
| `/picks` | Approved users (view), admin (add) | Tracked picks with record, units, P&L and ROI; filters for stat, team, over/under and date range |
| `/api/ev` | Approved users | JSON endpoint behind the EV table |

## Database

Main Supabase tables:

- **`props`**: one row per priced prop, with player, stat, line, direction, odds, bookmaker, game, projection, scenario, EV and market type (standard/alternate)
- **`lines`**: bookmaker lines for the lines page
- **`picks`**: tracked bets, with player, team, stat, line, direction, odds, bookmaker, units, result (`win` / `loss` / `pending`), actual stat, game date and notes
- **`user_access`**: per-user access flags
  - `subscribed`: set by the Stripe webhook
  - `override`: manual access granted by the admin
  - `is_admin`: can add and edit picks

Row-level security limits reads on `props` and `picks` to users with `subscribed = true` or `override = true`. Only the pipeline's service role writes to them.

## Local setup

```bash
git clone <repo-url> brody-bets
cd brody-bets
npm install
cp .env.example .env.local
npm run dev
```

Fill in the values below in `.env.local`, then open http://localhost:3000.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

Use the Supabase legacy anon key, not the newer publishable key. `SUPABASE_SERVICE_KEY` is the service role key. It's server-side only and is used by the Stripe webhook. `STRIPE_PRICE_ID` is the ID of the subscription price in Stripe.

In production, the same variables are set in Vercel, with `NEXT_PUBLIC_SITE_URL` pointing at `https://brodybets.com`.

## Deployment

Pushes to `main` deploy automatically through Vercel. After changing environment variables in Vercel, redeploy for them to take effect.

## Data refresh

The pipeline runs locally before games. It fetches odds, calculates EV, and uploads to the `props` and `lines` tables. The site picks up new data on the next page load.

## Adding a pick

Log in with an `is_admin` account, go to `/picks`, and use the add-bet form. Update the result and actual stat once the game is final. Record, P&L and ROI recalculate automatically.
