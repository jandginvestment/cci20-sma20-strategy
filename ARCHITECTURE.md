# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                   GitHub Actions (Cron)                       │
│           Mon–Fri · 10:30 AM IST & 4:00 PM IST               │
│                   scan.yml → curl POST /scan                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Railway — FastAPI    │
              │   backend/api.py       │
              │                        │
              │   POST /scan  ─────────┼──► BackgroundTask
              │   GET  /watchlists     │         │
              │   GET  /results/{name} │         ▼
              │   GET  /health         │   backend/scanner.py
              └────────────┬───────────┘         │
                           │                     │ yfinance
                           │                     │ CCI(20), SMA(20)
                           │                     │ Lows (1w/1m/1y)
                           │                     │
                           │           ┌─────────▼──────────┐
                           │           │  Couchbase Capella  │
                           └──────────►│  bucket: scan-results│
                             KV reads  │                      │
                                       │  results::{name}     │
                                       │  index::watchlists   │
                                       └──────────────────────┘
                                                 ▲
                           ┌─────────────────────┘
                           │  GET /watchlists + /results/{name}
                           │
              ┌────────────┴───────────┐
              │  Angular 17 Dashboard  │
              │  GitHub Pages          │
              │  frontend/src/app/     │
              └────────────────────────┘
                           ▲
              ┌────────────┘
              │  browser (user)
```

## Components

### 1. GitHub Actions — `scan.yml`
- Runs on cron: Mon–Fri at 10:30 AM IST (market open) and 4:00 PM IST (market close)
- Single step: `curl -X POST .../scan` — no Python, no secrets, no compute
- Also triggerable manually via `workflow_dispatch`

### 2. GitHub Actions — `deploy.yml`
- Triggers only when `frontend/**` files change (not on backend commits)
- Builds Angular with `ng build --configuration production`
- Deploys static output to GitHub Pages via `actions/deploy-pages`

### 3. FastAPI on Railway — `backend/api.py`
| Endpoint | Description |
|---|---|
| `GET /health` | Liveness check |
| `GET /watchlists` | Returns list of scanned watchlists from `index::watchlists` |
| `GET /results/{name}` | Returns full scan results doc for one watchlist |
| `POST /scan` | Enqueues a background scan task; returns immediately |

- CORS enabled for `https://jandginvestment.github.io` and `localhost:4200`
- Singleton Couchbase connection (reused across requests)
- `orjson` used for NaN-safe JSON serialization

### 4. Scanner — `backend/scanner.py`
1. Connects to Couchbase
2. **Purges** all existing `results::*` and `index::watchlists` documents
3. Reads each `.csv` from `backend/watchlists/`
4. For each ticker: downloads 2yr daily OHLCV via `yfinance`, computes CCI(20) and SMA(20), records proximity to 1-week / 1-month / 1-year lows
5. Skips tickers with fewer than 252 rows or NaN values
6. Upserts `results::{watchlist_name}` document into Couchbase
7. Writes updated `index::watchlists`

### 5. Couchbase Capella
- Cluster: `cci20-sma20-strategy` (AWS eu-west-1, Ireland)
- Bucket: `scan-results`, default collection
- Two document types:
  - `results::{watchlist}` — `{ watchlist, results: [...], scanned_at }`
  - `index::watchlists` — `{ watchlists: [{name}], updated_at }`

### 6. Angular 17 Dashboard — `frontend/`
- Standalone component, hosted on GitHub Pages
- On load: `GET /watchlists` → auto-loads first watchlist → `GET /results/{name}`
- Features: signal classifier (CCI+SMA), low-proximity filters, sortable table, CCI sparklines, TradingView links

## Watchlist Management

Add or edit CSV files in `backend/watchlists/`. Each file becomes one sidebar entry.

```
# Accepted formats:
RELIANCE.NS          # plain list, no header
ticker               # or with header column
RELIANCE.NS
```

Tickers without `.NS` or `.BO` suffix get `.NS` appended automatically.

## Deployment

| Component | Platform | Trigger |
|---|---|---|
| Dashboard | GitHub Pages | Push to `main` touching `frontend/**` |
| API | Railway | Manual `railway up --service cci20-sma20-api` |
| Scanner | GitHub Actions | Cron Mon–Fri ×2, or `workflow_dispatch` |
| Database | Couchbase Capella | Managed cloud, always-on |

## Key Design Decisions

- **No CSV commits for results** — scan output lives only in Couchbase; GitHub repo stays clean
- **Railway as CORS proxy** — Couchbase Data API is CORS-blocked from browsers; Railway API bridges the gap
- **Purge before insert** — ensures Angular never sees a mix of stale + fresh results mid-scan
- **Lightweight CI** — GitHub Actions does a 3-second `curl`; all compute runs on Railway's persistent container
