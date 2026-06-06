# CCI (20) & SMA (20) Stock Scanner

> A fully automated NSE stock screening dashboard that scans for CCI/SMA momentum signals and proximity to weekly, monthly, and yearly price lows — updated twice daily, deployed automatically to the web.

🔗 **Live Dashboard → [jandginvestment.github.io/cci20-sma20-strategy](https://jandginvestment.github.io/cci20-sma20-strategy/)**

---

## What It Does

The scanner fetches 2 years of daily price data for every ticker across your watchlists, then computes:

- **CCI (20)** — Commodity Channel Index over 20 periods
- **SMA (20)** — Simple Moving Average over 20 periods
- **Distance from lows** — how far the current price is from its 1-week, 1-month, and 1-year lows (as a %)

Results are classified into one of four actionable signals (see table below), saved as CSVs, and pushed back to the repository — automatically triggering a fresh frontend build and deployment.

---

## Signal Reference

| Signal | Condition | Interpretation |
|---|---|---|
| 🔴 **Reversal Zone** | CCI < −100 & Price **below** SMA(20) | Oversold + below moving average — watch for reversal candle |
| 🟡 **Recovery** | CCI −100→0 & Price **above** SMA(20) | CCI climbing back while price holds above MA |
| 🟢 **Bullish Setup** | CCI 0–100 & Price **above** SMA(20) | Positive momentum, price confirmed above MA |
| 🟠 **Overbought** | CCI > 100 & Price **above** SMA(20) | Strong trend but approaching take-profit zone |

Low proximity filters (≤ 5% from low) help surface stocks near support levels for each timeframe.

---

## Architecture

```
cci20_sma20_strategy/
├── backend/
│   ├── scanner.py              # Core scanner — fetches data, computes indicators, writes CSVs
│   ├── requirements.txt        # Python deps (yfinance, pandas, numpy)
│   └── watchlists/             # CSV files with ticker lists (one per watchlist)
│
├── frontend/                   # Angular 17 web dashboard
│   └── src/
│       ├── app/                # Main component (table, filters, signals, sparklines)
│       └── assets/data/        # Auto-generated CSVs + watchlists.json (written by scanner)
│
└── .github/workflows/
    ├── scan.yml                # Runs scanner Mon–Fri at 10:30 AM & 4:00 PM IST
    └── deploy.yml              # Builds Angular app and deploys to GitHub Pages
```

---

## Automated Pipeline

```
GitHub Actions (scan.yml)
        │
        ▼
  Run scanner.py
  ─ Fetch 2yr price data via yfinance
  ─ Compute CCI(20), SMA(20), lows
  ─ Write *_results.csv + watchlists.json
        │
        ▼
  git commit + push  ──► triggers deploy.yml
                                │
                                ▼
                     ng build --configuration production
                                │
                                ▼
                     GitHub Pages  (live in ~2 min)
```

**Schedule:** Monday–Friday, twice daily
- **10:30 AM IST** (05:00 UTC) — at NSE market open
- **4:00 PM IST** (10:30 UTC) — at NSE market close

---

## Dashboard Features

- **Collapsible sidebar** — switch between watchlists instantly
- **4 signal filters** — Reversal Zone, Recovery, Bullish Setup, Overbought
- **Low proximity cards** — one-click filter for stocks near 1-year / 1-month / 1-week lows
- **Sortable table** — click any column header to sort ascending/descending
- **CCI sparkline** — 20-day CCI trend chart per row
- **TradingView link** — click any ticker to open its chart directly
- **Fully responsive** — works on desktop, tablet, and mobile with Android-standard touch targets

---

## Local Development

### Backend — Run the Scanner

```bash
cd backend
pip install -r requirements.txt

python scanner.py \
  --watchlists backend/watchlists \
  --output frontend/src/assets/data
```

### Frontend — Serve the Dashboard

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:4200
```

---

## Managing Watchlists

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

> **Note:** Tickers without a `.NS` or `.BO` suffix will automatically have `.NS` appended.

---

## Deployment

| What | How |
|---|---|
| **Frontend** | Auto-deployed to GitHub Pages on every push to `main` via `deploy.yml` |
| **Scanner** | Runs on schedule via `scan.yml` (Mon–Fri, twice daily) |
| **Manual scan** | Actions → **Scan Stocks** → **Run workflow** |
| **Manual deploy** | Actions → **Deploy to GitHub Pages** → **Run workflow** |
