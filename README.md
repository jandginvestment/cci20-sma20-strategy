# CCI (20) & SMA (20) Stock Scanner

A full-stack stock screening dashboard for NSE-listed stocks.  
Scans for CCI/SMA signals and proximity to weekly, monthly, and yearly price lows.

🔗 **Live Dashboard**: [jandginvestment.github.io/cci20-sma20-strategy](https://jandginvestment.github.io/cci20-sma20-strategy/)

---

## How It Works

1. **Scanner** (`backend/scanner.py`) runs automatically via GitHub Actions twice daily:
   - **10:30 AM IST** — at NSE market open
   - **4:00 PM IST** — at NSE market close
2. It fetches 2 years of price data via `yfinance`, computes **CCI(20)**, **SMA(20)**, and distance from yearly/monthly/weekly lows.
3. Results are saved as CSVs into `frontend/src/assets/data/` and committed back to the repo.
4. A second GitHub Actions workflow builds the **Angular frontend** and deploys to **GitHub Pages**.

---

## Signals

| Signal | Condition |
|---|---|
| 🔴 Reversal Zone | CCI < -100 & Price below SMA(20) |
| 🟡 Recovery | CCI -100→0 & Price above SMA(20) |
| 🟢 Bullish Setup | CCI 0-100 & Price above SMA(20) |
| 🟠 Overbought | CCI > 100 & Price above SMA(20) |

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python scanner.py --watchlists backend/watchlists --output frontend/src/assets/data
```

### Frontend
```bash
cd frontend
npm install
npm start
# Opens at http://localhost:4200
```

---

## Watchlists

Add or edit ticker CSVs in `backend/watchlists/`. Each file should have one ticker per row (with `.NS` suffix for NSE stocks) or a `ticker` column header.

---

## Deployment

- **Frontend**: Auto-deployed to GitHub Pages on every push to `main`
- **Scanner**: Runs on schedule via `.github/workflows/scan.yml` (Mon–Fri, twice daily)
- To manually trigger a scan: Go to **Actions → Scan Stocks → Run workflow**
