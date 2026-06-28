# 📊 CCI (20) & SMA (20) Stock Scanner

> Fully automated NSE stock screening dashboard — scans for CCI/SMA momentum signals and proximity to weekly, monthly, and yearly price lows, updated twice daily.

[![Live Dashboard](https://img.shields.io/badge/Live%20Dashboard-GitHub%20Pages-blue?style=for-the-badge&logo=github)](https://jandginvestment.github.io/cci20-sma20-strategy/)
[![API](https://img.shields.io/badge/API-Railway-blueviolet?style=for-the-badge&logo=railway)](https://cci20-sma20-api-production.up.railway.app/health)
[![DB](https://img.shields.io/badge/Database-Couchbase%20Capella-red?style=for-the-badge&logo=couchbase)](https://cloud.couchbase.com)
[![Scan Schedule](https://img.shields.io/badge/Scan-Mon–Fri%20%C3%97%202%2Fday-green?style=for-the-badge&logo=githubactions)](https://github.com/jandginvestment/cci20-sma20-strategy/actions)

---

## 🚀 Live Links

| Resource | URL |
|---|---|
| 🌐 **Dashboard** | https://jandginvestment.github.io/cci20-sma20-strategy/ |
| ⚡ **REST API** | https://cci20-sma20-api-production.up.railway.app |
| 💓 **Health Check** | https://cci20-sma20-api-production.up.railway.app/health |
| 📋 **Watchlists** | https://cci20-sma20-api-production.up.railway.app/watchlists |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions (Cron)                     │
│          Mon–Fri · 10:30 AM IST & 4:00 PM IST              │
└──────────────────────────┬──────────────────────────────────┘
                           │  runs scanner.py
                           ▼
              ┌────────────────────────┐
              │   scanner.py           │
              │  ─ yfinance (2yr data) │
              │  ─ CCI(20), SMA(20)   │
              │  ─ Weekly/Monthly/     │
              │    Yearly Lows         │
              └────────────┬───────────┘
                           │  upserts JSON documents
                           ▼
              ┌────────────────────────┐
              │  Couchbase Capella     │
              │  bucket: scan-results  │
              │  ─ results::{watchlist}│
              │  ─ index::watchlists   │
              └────────────┬───────────┘
                           │  reads via SDK
                           ▼
              ┌────────────────────────┐
              │  FastAPI on Railway    │
              │  GET /watchlists       │
              │  GET /results/{name}   │
              └────────────┬───────────┘
                           │  HTTP (CORS-enabled)
                           ▼
              ┌────────────────────────┐
              │  Angular 17 Dashboard  │
              │  GitHub Pages          │
              └────────────────────────┘
```

---

## 📡 Signal Reference

| Signal | Condition | Interpretation |
|:---:|---|---|
| 🔴 **Reversal Zone** | CCI < −100 & Price **below** SMA(20) | Oversold + below moving average — watch for reversal candle |
| 🟡 **Recovery** | CCI −100→0 & Price **above** SMA(20) | CCI climbing back while price holds above MA |
| 🟢 **Bullish Setup** | CCI 0–100 & Price **above** SMA(20) | Positive momentum, price confirmed above MA |
| 🟠 **Overbought** | CCI > 100 & Price **above** SMA(20) | Strong trend but approaching take-profit zone |

> **Low proximity filters** (≤ 5% from low) surface stocks near support levels across all three timeframes.

---

## 📁 Project Structure

```
cci20_sma20_strategy/
├── backend/
│   ├── scanner.py          # Fetches price data, computes CCI/SMA, writes to Couchbase
│   ├── api.py              # FastAPI app — reads from Couchbase, serves Angular
│   ├── requirements.txt    # Scanner dependencies (yfinance, pandas, couchbase)
│   └── watchlists/         # Ticker CSV files (one per watchlist)
│
├── frontend/               # Angular 17 web dashboard
│   └── src/app/            # Main component (signals, filters, sparklines, table)
│
├── requirements.txt        # API dependencies for Railway (fastapi, uvicorn, couchbase)
├── railway.toml            # Railway deployment config
│
└── .github/workflows/
    ├── scan.yml            # Runs scanner Mon–Fri at 10:30 AM & 4:00 PM IST
    └── deploy.yml          # Builds Angular and deploys to GitHub Pages
```

---

## ✨ Dashboard Features

| Feature | Description |
|---|---|
| 📂 **Collapsible Sidebar** | Switch between watchlists instantly |
| 🎯 **4 Signal Filters** | Reversal Zone, Recovery, Bullish Setup, Overbought |
| 📉 **Low Proximity Cards** | One-click filter for stocks near 1-year / 1-month / 1-week lows |
| 🔃 **Sortable Table** | Click any column header to sort ascending / descending |
| 📈 **CCI Sparkline** | 20-day CCI mini-chart per stock row |
| 🔗 **TradingView Link** | Click any ticker to open its live chart |
| 📱 **Fully Responsive** | Desktop, tablet, and mobile with Android-standard touch targets |

---

## 🛠️ Local Development

### Prerequisites

Create a [Couchbase Capella](https://cloud.couchbase.com) free cluster and a bucket named `scan-results`.

### Backend — Run the Scanner

```bash
cd backend
pip install -r requirements.txt

export CB_CONN_STR="couchbases://cb.xxxx.cloud.couchbase.com"
export CB_USERNAME="scanner-bot"
export CB_PASSWORD="your-password"

python scanner.py --watchlists backend/watchlists
```

### Backend — Run the API Locally

```bash
pip install -r requirements.txt   # root-level (fastapi, uvicorn, couchbase)

export CB_CONN_STR="couchbases://cb.xxxx.cloud.couchbase.com"
export CB_USERNAME="scanner-bot"
export CB_PASSWORD="your-password"

uvicorn backend.api:app --reload
# API runs at http://localhost:8000
```

### Frontend — Serve the Dashboard

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:4200
```

---

## 📋 Managing Watchlists

Add or edit ticker CSV files inside `backend/watchlists/`. Each file becomes one watchlist in the sidebar.

**Accepted formats:**

```csv
# Format 1 — plain list (no header)
RELIANCE.NS
TCS.NS
INFY.NS

# Format 2 — with header column
ticker
RELIANCE.NS
TCS.NS
INFY.NS
```

> Tickers without a `.NS` or `.BO` suffix will automatically have `.NS` appended.

---

## ⚙️ Deployment

| Component | Platform | How |
|---|---|---|
| **Dashboard (Angular)** | GitHub Pages | Auto-deploy on push to `main` via `deploy.yml` |
| **API (FastAPI)** | Railway | Auto-deploy on push to `main` via `railway.toml` |
| **Scanner** | GitHub Actions | Runs on schedule Mon–Fri, twice daily |
| **Database** | Couchbase Capella | Cluster in AWS eu-west-1 (Ireland) |

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `CB_CONN_STR` | Couchbase connection string |
| `CB_USERNAME` | Couchbase database user (read/write) |
| `CB_PASSWORD` | Couchbase database password |

### Manual Triggers

| Action | How |
|---|---|
| Force scan now | Actions → **Scan Stocks** → **Run workflow** |
| Force redeploy | Actions → **Deploy to GitHub Pages** → **Run workflow** |
