# CCI/SMA Scanner

> Automated NSE stock screening dashboard — scans CCI(20) & SMA(20) momentum signals and proximity to weekly, monthly, and yearly price lows. Refreshed twice daily on market days.

[![Live Dashboard](https://img.shields.io/badge/Live%20Dashboard-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://jandginvestment.github.io/cci20-sma20-strategy/)
[![API](https://img.shields.io/badge/API-AWS%20Lambda-orange?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com)
[![DB](https://img.shields.io/badge/Database-Neon%20PostgreSQL-3ECF8E?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Scan Schedule](https://img.shields.io/badge/Scan-Mon–Fri%20×%202%2Fday-green?style=for-the-badge&logo=amazoneventbridge)](https://aws.amazon.com/eventbridge/)

---

## Live Links

| Resource | URL |
|---|---|
| **Dashboard** | https://jandginvestment.github.io/cci20-sma20-strategy/ |
| **REST API** | AWS API Gateway (HTTP API) — see stack outputs |
| **Health Check** | `GET /health` |

---

## Architecture

```
EventBridge Cron (AWS)
  Mon–Fri  10:30 AM IST  (market open)
  Mon–Fri   4:00 PM IST  (market close)
          │
          ▼
  Scanner Lambda  (ECR container image — no 250 MB limit)
  ┌──────────────────────────────────────────────────┐
  │  scanner.py                                      │
  │  · yfinance 1.x + curl_cffi  →  380 days OHLCV  │
  │  · CCI(20), SMA(20), weekly CPR                  │
  │  · 1-yr / 1-mo / 1-wk low prices & % distance   │
  │  · Auto-removes delisted tickers from watchlists │
  └──────────────────┬───────────────────────────────┘
                     │ upserts  daily_stock_metrics
                     ▼
          Neon PostgreSQL  (ap-southeast-1)
                     │
                     ▼
  API Lambda  (zip, ~35 MB — FastAPI + Mangum)
  ┌──────────────────────────────────────────────────┐
  │  api.py                                          │
  │  · JWT auth via AWS Cognito                      │
  │  · GET /watchlists  /results/{name}  /scan       │
  └──────────────────┬───────────────────────────────┘
                     │ HTTP (CORS-enabled)
                     ▼
  Angular 19 Dashboard  →  GitHub Pages
```

---

## Signal Reference

| Signal | Condition | Interpretation |
|:---:|---|---|
| **Reversal Zone** | CCI < −100 & Price **below** SMA(20) | Oversold + below moving average — watch for reversal candle |
| **Recovery** | −100 < CCI < 0 & Price **above** SMA(20) | CCI climbing back while price holds above MA |
| **Bullish Setup** | 0 < CCI < 100 & Price **above** SMA(20) | Positive momentum, price confirmed above MA |
| **Overbought** | CCI > 100 & Price **above** SMA(20) | Strong trend but approaching take-profit zone |

Low proximity cards surface stocks within 10% / 5% / 2% of their 1-year, 1-month, and 1-week lows.

---

## Dashboard Features

| Feature | Description |
|---|---|
| **Guided Tour** | 7-step first-run tour — auto-starts for new users, re-launchable from sidebar |
| **Signal Filters** | One-click filter for Reversal Zone, Recovery, Bullish Setup, Overbought |
| **Near-Low Cards** | Count of stocks within 10% / 5% / 2% of each low timeframe; click to filter table |
| **Narrow CPR Filter** | Shows only stocks with a weekly CPR width < 0.5% — high-conviction setups |
| **Sortable Table** | Click any column header to sort ascending / descending |
| **CCI Sparkline** | 20-day CCI mini-chart per row |
| **Combined LOW column** | Shows actual low price + distance bar + % in a single compact cell |
| **TradingView Link** | Click the chart icon next to any ticker to open its live NSE chart |
| **Collapsible Sidebar** | Switch watchlists; admin panel for admin users |
| **Responsive** | Desktop, tablet, and mobile |

---

## Project Structure

```
cci20_sma20_strategy/
├── backend/
│   ├── scanner.py              # Downloads OHLCV, computes indicators, upserts to Neon
│   ├── scanner_lambda.py       # Lambda handler wrapping scanner.py
│   ├── Dockerfile.scanner      # Multi-stage ECR image (scanner Lambda)
│   ├── scanner_requirements.txt# pandas, numpy, yfinance, curl_cffi, sqlalchemy
│   ├── api.py                  # FastAPI app — JWT auth, watchlist CRUD, signal query
│   ├── lambda_handler.py       # Mangum handler wrapping api.py
│   ├── requirements.txt        # API Lambda deps (fastapi, mangum, asyncpg, etc.)
│   ├── auth.py                 # Cognito JWT verification
│   ├── db/
│   │   └── models.py           # SQLAlchemy ORM (User, Watchlist, WatchlistItem, DailyStockMetric)
│   └── watchlists/             # Default system CSVs (FandO.csv, Nifty50.csv, …)
│
├── frontend/                   # Angular 19 standalone components
│   └── src/app/
│       ├── core/
│       │   ├── auth/           # Cognito PKCE flow, token refresh
│       │   ├── api/            # watchlist.service, scan.service
│       │   └── tour.service.ts # Step/active signals for guided tour
│       ├── pages/
│       │   ├── dashboard/      # Stat cards, watchlist grid, scan trigger
│       │   ├── watchlist/      # Scanner table, filters, near-low counters
│       │   ├── settings/       # Watchlist upload/delete
│       │   └── admin/          # Admin-only panel
│       └── shared/components/
│           ├── tour/           # Spotlight + tooltip guided tour
│           ├── sidebar/        # Collapsible nav with watchlist list
│           ├── sparkline/      # SVG CCI sparkline
│           └── signal-badge/   # Coloured signal pill
│
├── infra/
│   └── template.yaml           # AWS SAM — Cognito, Scanner Lambda, API Lambda, EventBridge
│
└── .github/workflows/
    ├── deploy.yml              # Angular → GitHub Pages on push to main
    └── deploy-aws.yml          # SAM build + deploy on push to aws branch
```

---

## Local Development

### Prerequisites

- Node 20+ and Angular CLI (`npm i -g @angular/cli`)
- Python 3.11+
- A [Neon](https://neon.tech) PostgreSQL database (free tier is fine)
- AWS credentials with Cognito user pool created (or use the SAM stack)

### Backend — API

```bash
cd backend
pip install -r requirements.txt

# .env file (or export these):
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?sslmode=require
DATABASE_URL_SYNC=postgresql://user:pass@host/db?sslmode=require
COGNITO_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXX
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

uvicorn api:app --reload
# API runs at http://localhost:8000
```

### Backend — Scanner (local run)

```bash
cd backend
pip install -r scanner_requirements.txt

python scanner.py --watchlists backend/watchlists
```

### Frontend

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:4200
```

---

## Managing Watchlists

Users upload watchlists through the **Settings** page in the dashboard (CSV file + name). The scanner picks up all user watchlists on the next run.

For default system watchlists, add or edit CSVs in `backend/watchlists/`. Each file becomes one watchlist visible to all users.

**Accepted CSV formats:**

```csv
# Plain list (no header)
RELIANCE
TCS
INFY

# With header
ticker
RELIANCE
TCS
INFY
```

Tickers without a `.NS` or `.BO` suffix have `.NS` appended automatically. Tickers that yfinance reports as delisted (empty response) are removed from all watchlists automatically on the next scan.

---

## Deployment

| Component | Platform | Trigger |
|---|---|---|
| **Dashboard** | GitHub Pages | Push to `main` → `deploy.yml` |
| **API Lambda** | AWS Lambda (zip) | Push to `aws` → `deploy-aws.yml` (SAM) |
| **Scanner Lambda** | AWS Lambda (ECR) | Push to `aws` → `deploy-aws.yml` (SAM) |
| **Scanner schedule** | AWS EventBridge | Cron — Mon–Fri 10:30 AM & 4:00 PM IST |
| **Database** | Neon PostgreSQL | Serverless, always-on |
| **Auth** | AWS Cognito | Hosted UI + PKCE flow |

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM key for SAM deploy |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `DATABASE_URL` | Neon async URL (`postgresql+asyncpg://…`) |
| `DATABASE_URL_SYNC` | Neon sync URL (`postgresql://…`) |
| `ADMIN_COGNITO_SUB` | Cognito sub of the admin user |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Manual Deploy (API-only, no Docker)

When only `api.py` or `lambda_handler.py` changes, bypass SAM and push directly:

```bash
cd backend
python zip_it.py                          # builds deploy.zip

S3_BUCKET=aws-sam-cli-managed-default-samclisourcebucket-efhkzaapcrdw
aws s3 cp deploy.zip s3://$S3_BUCKET/deploy.zip
aws lambda update-function-code \
  --function-name cci-sma-api \
  --s3-bucket $S3_BUCKET \
  --s3-key deploy.zip
```

### Manual Deploy (Scanner image)

When `scanner.py` or `scanner_requirements.txt` changes:

```bash
cd backend
ECR=493822200263.dkr.ecr.ap-southeast-1.amazonaws.com/cci-sma-scanner

aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin $ECR

docker build -f Dockerfile.scanner -t $ECR:latest .
docker push $ECR:latest

aws lambda update-function-code \
  --function-name cci-sma-scanner \
  --image-uri $ECR:latest
```
