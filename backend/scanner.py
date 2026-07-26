"""
CCI/SMA Stock Scanner — PostgreSQL edition.

Replaces the Couchbase-backed scanner.py.
Uses SQLAlchemy sync (psycopg2) — compatible with non-async Lambda context.

Changes from Couchbase version
  • collection.upsert()  →  session.add(ScanResult(...))
  • purge_existing()     →  removed (we KEEP history — each run inserts a new ScanRun)
  • INDEX_KEY document   →  auto-derived from watchlists table
  • Admin user resolved via ADMIN_COGNITO_SUB env var
"""
from __future__ import annotations

import datetime
import os
import sys

import numpy as np
import pandas as pd
import yfinance as yf
from tqdm import tqdm

_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from db.models import Base, ScanResult, ScanRun, User, Watchlist


# ── DB session factory ─────────────────────────────────────────────────────────

def _make_session() -> Session:
    raw = os.environ.get("DATABASE_URL_SYNC") or os.environ["DATABASE_URL"]
    url = raw.replace("+asyncpg", "")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(engine)   # idempotent — ensures tables exist
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


# ── Ticker / watchlist readers ─────────────────────────────────────────────────

def _read_tickers(watchlist_path: str) -> list[str]:
    """
    Read tickers from a CSV file robustly.
    Handles both headered ('ticker') and headerless CSVs.
    Strips surrounding quotes. Skips blank or non-string rows.
    (Logic preserved from the original Couchbase scanner.)
    """
    try:
        df = pd.read_csv(watchlist_path)
        df.columns = [c.strip().strip('"').lower() for c in df.columns]
        if "ticker" in df.columns:
            raw = df["ticker"].tolist()
        else:
            df  = pd.read_csv(watchlist_path, header=None)
            raw = df[0].tolist()
    except Exception as exc:
        print(f"Error reading watchlist {watchlist_path}: {exc}")
        return []

    tickers: list[str] = []
    for v in raw:
        if not isinstance(v, str):
            continue
        v = v.strip().strip('"')
        if not v or v.lower() == "ticker":
            continue
        tickers.append(v)
    return tickers


def _get_or_create_watchlist(session: Session, user_id, name: str) -> Watchlist:
    wl = session.execute(
        select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.name == name)
    ).scalar_one_or_none()
    if not wl:
        wl = Watchlist(user_id=user_id, name=name)
        session.add(wl)
        session.flush()
    return wl


# ── Per-watchlist processing ────────────────────────────────────────────────────

def process_watchlist(watchlist_path: str, session: Session, user_id) -> str | None:
    tickers = _read_tickers(watchlist_path)
    if not tickers:
        return None

    name = os.path.splitext(os.path.basename(watchlist_path))[0]
    print(f"\nScanning {len(tickers)} tickers from '{name}'...")

    wl = _get_or_create_watchlist(session, user_id, name)

    # Each scanner run = a new ScanRun row (preserves full history)
    scan_run = ScanRun(watchlist_id=wl.id, scanned_at=datetime.datetime.utcnow())
    session.add(scan_run)
    session.flush()

    result_rows: list[ScanResult] = []

    for ticker in tqdm(tickers):
        ticker_symbol = ticker.strip()
        if not ticker_symbol:
            continue
        if not ticker_symbol.endswith(".NS") and not ticker_symbol.endswith(".BO"):
            ticker_symbol += ".NS"

        try:
            end_date   = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=380)
            df = yf.download(
                ticker_symbol, start=start_date, end=end_date,
                interval="1d", progress=False,
            )

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)

            if df.empty or len(df) < 252:
                print(f"  SKIP {ticker_symbol}: rows={len(df)}")
                continue

            df["SMA_20"]    = df["Close"].rolling(window=20).mean()
            typical_price   = (df["High"] + df["Low"] + df["Close"]) / 3
            sma_tp          = typical_price.rolling(window=20).mean()
            mean_dev        = typical_price.rolling(window=20).apply(
                lambda x: np.abs(x - x.mean()).mean(), raw=True
            )
            df["CCI_20"]    = (typical_price - sma_tp) / (0.015 * mean_dev)

            latest_price = float(df["Close"].iloc[-1])
            cci_20       = float(df["CCI_20"].iloc[-1])
            sma_20       = float(df["SMA_20"].iloc[-1])

            if any(np.isnan(v) for v in [latest_price, cci_20, sma_20]):
                print(f"  NaN  {ticker_symbol}")
                continue

            yearly_low  = float(df["Low"].rolling(window=252).min().iloc[-1])
            monthly_low = float(df["Low"].rolling(window=21).min().iloc[-1])
            weekly_low  = float(df["Low"].rolling(window=5).min().iloc[-1])

            pct_yearly  = ((latest_price - yearly_low)  / yearly_low)  * 100
            pct_monthly = ((latest_price - monthly_low) / monthly_low) * 100
            pct_weekly  = ((latest_price - weekly_low)  / weekly_low)  * 100

            cci_hist = [
                round(x, 1) if not np.isnan(x) else 0.0
                for x in df["CCI_20"].iloc[-20:].tolist()
            ]

            result_rows.append(ScanResult(
                scan_run_id    = scan_run.id,
                ticker         = ticker_symbol,
                close          = round(latest_price, 4),
                cci_20         = round(cci_20, 4),
                sma_20         = round(sma_20, 4),
                yearly_low     = round(yearly_low, 4),
                monthly_low    = round(monthly_low, 4),
                weekly_low     = round(weekly_low, 4),
                pct_from_y_low = round(pct_yearly, 4),
                pct_from_m_low = round(pct_monthly, 4),
                pct_from_w_low = round(pct_weekly, 4),
                near_y_low     = bool(pct_yearly  <= 5.0),
                near_m_low     = bool(pct_monthly <= 5.0),
                near_w_low     = bool(pct_weekly  <= 5.0),
                cci_history    = cci_hist,
            ))

        except Exception as exc:
            print(f"  ERROR {ticker_symbol}: {exc}")

    session.add_all(result_rows)
    scan_run.ticker_count = len(result_rows)
    session.commit()

    print(f"  → Saved {len(result_rows)} results for '{name}' (run_id={scan_run.id})")
    return name


# ── Full scan ──────────────────────────────────────────────────────────────────

def run_scanner(watchlists_dir: str, user_id=None):
    if not os.path.isdir(watchlists_dir):
        print(f"Error: {watchlists_dir} is not a valid directory.")
        return

    session = _make_session()

    # Resolve admin user (scanner always runs as this user)
    if user_id is None:
        admin_sub = os.environ.get("ADMIN_COGNITO_SUB", "scanner-admin")
        user = session.execute(
            select(User).where(User.cognito_sub == admin_sub)
        ).scalar_one_or_none()
        if not user:
            user = User(cognito_sub=admin_sub, email="scanner@local")
            session.add(user)
            session.flush()
            session.commit()
        user_id = user.id

    for filename in sorted(os.listdir(watchlists_dir)):
        if filename.endswith(".csv"):
            process_watchlist(os.path.join(watchlists_dir, filename), session, user_id)

    session.close()
    print("\nScanner run complete.")


# ── CLI entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CCI/SMA Stock Scanner — PostgreSQL edition")
    parser.add_argument("--watchlists", default=os.path.join(_here, "watchlists"))
    args = parser.parse_args()
    run_scanner(args.watchlists)
