# Contributing to CCI/SMA Scanner

Thanks for your interest! There are three ways to participate — pick what suits you.

---

## 1. Just use it (no setup required)

The scanner is live and open for anyone to sign up:

**[https://jandginvestment.github.io/cci20-sma20-strategy/](https://jandginvestment.github.io/cci20-sma20-strategy/)**

- Click **Sign Up** and register with your email address
- Verify your email — you're in
- Default watchlists (Nifty 50, F&O, etc.) are available immediately
- Upload your own watchlist CSVs from the **Settings** page
- Data refreshes automatically every weekday at **10:30 AM IST** (open) and **4:00 PM IST** (close)

No AWS account, no Python, no setup needed.

---

## 2. Suggest or contribute a watchlist

If you have a curated list of NSE tickers you think would be useful to others — a sector basket, a smallcap index, a custom theme — open an issue or a pull request.

**Via issue (easiest):**

[Open an issue](https://github.com/jandginvestment/cci20-sma20-strategy/issues/new) with:
- Watchlist name
- The list of NSE ticker symbols (without `.NS`)
- Brief reason why it would be useful

**Via pull request:**

1. Fork the repo
2. Add a CSV file to `backend/watchlists/` — one ticker per line, no header needed:
   ```
   RELIANCE
   TCS
   INFY
   HDFCBANK
   ```
3. Open a PR — the watchlist will be picked up on the next scan run

> Tickers without a `.NS` suffix get it appended automatically. Delisted tickers are removed automatically on each scan.

---

## 3. Contribute code

1. **Fork** the repo and create a branch from `main`
2. Make your changes — bug fix, new feature, UI improvement
3. Test locally:
   ```bash
   # Frontend
   cd frontend && npm install && npm start

   # Scanner (needs a Neon PostgreSQL URL in .env)
   cd backend && pip install -r scanner_requirements.txt
   python scanner.py --watchlists backend/watchlists
   ```
4. Open a pull request with a clear description of what you changed and why

### Good first issues

- Add a new default watchlist (sector ETFs, Nifty Midcap, etc.)
- Improve mobile table layout
- Add a % change column (day-over-day close)
- Add volume data to the sparkline

### Tech stack

| Layer | Tech |
|---|---|
| Frontend | Angular 19, standalone components, signals |
| API | FastAPI + Mangum on AWS Lambda |
| Scanner | Python, yfinance 1.x, pandas, AWS Lambda (ECR) |
| Database | Neon PostgreSQL (SQLAlchemy ORM) |
| Auth | AWS Cognito (PKCE flow) |
| Schedule | AWS EventBridge cron (twice daily, weekdays) |
| Hosting | GitHub Pages (frontend) + AWS API Gateway (API) |

---

## Questions?

Open an [issue](https://github.com/jandginvestment/cci20-sma20-strategy/issues) — happy to help.
