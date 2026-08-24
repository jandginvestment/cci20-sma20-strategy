# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│              AWS EventBridge (Cron)                           │
│         Mon–Fri · 10:30 AM IST & 4:00 PM IST                 │
└──────────────────────────┬───────────────────────────────────┘
                           │ invokes
                           ▼
              ┌────────────────────────┐
              │  Scanner Lambda        │
              │  (ECR container)       │
              │  scanner_lambda.py     │
              │                        │
              │  yfinance ~260 t-days  │
              │  CCI(20), SMA(20)      │
              │  Weekly/Monthly/Yearly │
              │  Low proximity         │
              └────────────┬───────────┘
                           │ bulk upsert
                           ▼
              ┌────────────────────────┐
              │  PostgreSQL (Neon)     │
              │                        │
              │  users                 │
              │  watchlists            │
              │  watchlist_items       │
              │  user_subscriptions    │
              │  daily_stock_metrics   │◄─── central results cache
              └────────────┬───────────┘
                           │ async SQLAlchemy
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  AWS API Gateway (HTTP API)                                   │
│   └─► API Lambda (zip) — Mangum → FastAPI                    │
│                                                               │
│   GET  /health                    (public)                    │
│   GET  /me                        (auth)                      │
│   GET  /watchlists                (auth — owned + subscribed) │
│   POST /watchlists                (auth — create)             │
│   POST /watchlists/{id}/items     (auth — add ticker)         │
│   DELETE /watchlists/{id}/items/{t} (auth — remove ticker)   │
│   GET  /watchlists/share/{share_id} (public — preview)       │
│   POST /watchlists/subscribe/{share_id} (auth — subscribe)   │
│   GET  /results/{watchlist}       (auth — latest metrics)     │
│   POST /scan                      (auth — invoke Scanner λ)   │
└──────────────────────────┬───────────────────────────────────┘
                           │ Cognito JWT (Bearer)
                           ▼
              ┌────────────────────────┐
              │  AWS Cognito           │
              │  User Pool             │
              │  email + password auth │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Angular 19 Portal     │
              │  GitHub Pages          │
              │  auth, routing,        │
              │  watchlist management  │
              └────────────────────────┘
```

---

## Components

### 1. Scanner Lambda — `backend/scanner_lambda.py` + `backend/scanner.py`
- ECR container image (no zip size limit — heavy deps: yfinance, pandas, numpy)
- Triggered by **EventBridge cron** (Mon–Fri × 2) or **async boto3 invoke** from API
- Downloads ~260 trading days (380 calendar days) of OHLCV via yfinance
- Computes CCI(20), SMA(20), weekly/monthly/yearly lows per ticker
- Writes to `daily_stock_metrics` table keyed by `(ticker, scan_date)` — one row per ticker per day
- Skips tickers with < 252 rows or NaN values (delisted / insufficient data)

### 2. API Lambda — `backend/lambda_handler.py` + `backend/api.py`
- Zip-packaged Lambda (~35 MB) behind API Gateway HTTP API
- Mangum adapter bridges API Gateway events → FastAPI ASGI
- All routes (except `/health`) require Cognito JWT in `Authorization: Bearer` header
- `/results/{watchlist}` does a SQL JOIN: `watchlist_items ──► daily_stock_metrics` — no on-demand yfinance calls

### 3. PostgreSQL — Neon (serverless Postgres)
| Table | Purpose |
|---|---|
| `users` | Cognito-authenticated users (auto-created on first JWT login) |
| `watchlists` | Named lists owned by a user; each has a unique `share_id` (e.g. `sh_a8f9c2`) |
| `watchlist_items` | Individual tickers per watchlist |
| `user_subscriptions` | Links users to shared watchlists they've subscribed to |
| `daily_stock_metrics` | Central results cache — CCI, SMA, lows per ticker per `scan_date` |

### 4. Cognito User Pool
- Email + password auth; auto-verifies email
- JWT issued to Angular frontend; validated on every API Lambda request via `backend/auth.py`
- `ADMIN_COGNITO_SUB` env var used by Scanner Lambda to attribute pre-loaded watchlist CSVs

### 5. Angular 19 Frontend — `frontend/`
- Auth flow (Cognito login/signup), routing, watchlist management UI
- Hosted on GitHub Pages; built and deployed via `deploy-aws.yml`
- `GET /watchlists` → sidebar shows owned + subscribed watchlists
- `GET /results/{id}` → signal table, CCI sparklines, low-proximity filters

### 6. Watchlist Sharing
- Every watchlist has a short `share_id` (e.g. `sh_a8f9c2`)
- `GET /watchlists/share/{share_id}` — public preview (no auth)
- `POST /watchlists/subscribe/{share_id}` — subscribe; results appear in subscriber's sidebar automatically

---

## Deployment

| Component | Platform | How |
|---|---|---|
| API Lambda + Cognito + EventBridge | AWS (ap-southeast-1) | `sam build` → `sam deploy` via `deploy-aws.yml` on push to `aws` branch |
| Scanner Lambda | AWS ECR + Lambda | SAM builds container, deploys via same workflow |
| Dashboard (Angular 19) | GitHub Pages | `deploy-aws.yml` — built and deployed on push to `aws` branch |
| Database | Neon (serverless Postgres) | Managed cloud; Alembic migrations in `backend/db/migrations/` |

### GitHub Secrets Required

| Secret | Used by |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | SAM deploy |
| `DATABASE_URL` | API Lambda (async — `postgresql+asyncpg://...`) |
| `DATABASE_URL_SYNC` | Scanner Lambda (sync — `postgresql://...`) |
| `ADMIN_COGNITO_SUB` | Scanner Lambda — owner of pre-loaded CSVs |
| `CORS_ORIGINS` | API Lambda CORS allowlist |

---

## Data Flow

### Scan (twice daily, automatic)
```
EventBridge cron
  → Scanner Lambda
    → yfinance download (~260 t-days per ticker)
    → CCI(20) / SMA(20) / low proximity computed
    → UPSERT daily_stock_metrics (ticker, scan_date, metrics...)
```

### User Views Results
```
Browser (JWT)
  → GET /results/{watchlist_id}
  → API Lambda resolves watchlist → SQL JOIN watchlist_items × daily_stock_metrics
  → Returns latest scan_date metrics for all tickers in the watchlist
```

### Manual Scan Trigger
```
Browser → POST /scan (auth)
  → API Lambda → boto3.invoke(Scanner Lambda, InvocationType="Event")  [async]
  → Returns immediately; scan runs in background
```

---

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
export DATABASE_URL="postgresql+asyncpg://..."
export DATABASE_URL_SYNC="postgresql://..."
export COGNITO_USER_POOL_ID="ap-southeast-1_xxx"
export COGNITO_APP_CLIENT_ID="xxx"
uvicorn api:app --reload

# Frontend
cd frontend
npm install
npm start   # http://localhost:4200

# Scanner (local run)
python scanner.py --watchlists backend/watchlists
```
