"""
FastAPI application — PostgreSQL + Cognito JWT edition.
Replaces the Couchbase-backed api.py on the main branch.

New in v2
  • All routes require JWT (except /health)
  • Watchlists are per-user (multi-tenant ready)
  • POST /watchlists accepts CSV file upload
  • GET /history/{watchlist} — past scan runs
  • GET /history/{watchlist}/{run_id} — specific historical run
  • POST /scan — invokes Scanner Lambda asynchronously (fire & forget)
  • GET /scan/status — last scan info across all user's watchlists
"""
from __future__ import annotations

import json
import logging
import os
import sys

import boto3
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

_backend_dir = os.path.dirname(__file__)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from auth import get_current_user
from db.connection import get_db
from db.models import ScanResult, ScanRun, User, Watchlist

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

SCANNER_LAMBDA_NAME = os.environ.get("SCANNER_LAMBDA_NAME", "")
_raw_origins        = os.environ.get(
    "CORS_ORIGINS",
    "https://jandginvestment.github.io,http://localhost:4200",
)
CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CCI/SMA Scanner API",
    version="2.0.0",
    default_response_class=ORJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    """Liveness + DB connectivity check."""
    try:
        await db.execute(select(func.now()))
        return {"status": "ok", "db": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {exc}")

# ── Me ─────────────────────────────────────────────────────────────────────────

@app.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id":         str(current_user.id),
        "email":      current_user.email,
        "created_at": current_user.created_at,
    }

# ── Watchlists ─────────────────────────────────────────────────────────────────

@app.get("/watchlists")
async def get_watchlists(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated user's watchlists."""
    result = await db.execute(
        select(Watchlist)
        .where(Watchlist.user_id == current_user.id)
        .order_by(Watchlist.name)
    )
    wls = result.scalars().all()
    return [{"name": wl.name, "id": wl.id, "created_at": wl.created_at} for wl in wls]


@app.post("/watchlists", status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    name: str        = Form(..., description="Watchlist name (alphanumeric + underscore)"),
    file: UploadFile = File(..., description="CSV file with tickers"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Create a watchlist and upload its CSV ticker file."""
    name = name.strip()
    if not name:
        raise HTTPException(400, "Name cannot be empty")

    # Duplicate check
    existing = await db.execute(
        select(Watchlist).where(
            Watchlist.user_id == current_user.id,
            Watchlist.name    == name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Watchlist '{name}' already exists")

    # Persist CSV
    watchlists_dir = os.path.join(_backend_dir, "watchlists")
    os.makedirs(watchlists_dir, exist_ok=True)
    csv_path = os.path.join(watchlists_dir, f"{name}.csv")
    content  = await file.read()
    with open(csv_path, "wb") as fh:
        fh.write(content)

    # Create DB record
    wl = Watchlist(user_id=current_user.id, name=name)
    db.add(wl)
    await db.flush()
    return {"name": wl.name, "id": wl.id}


@app.delete("/watchlists/{name}")
async def delete_watchlist(
    name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    wl = await _get_watchlist_or_404(name, current_user, db)
    await db.delete(wl)

    # Remove CSV file if present
    csv_path = os.path.join(_backend_dir, "watchlists", f"{name}.csv")
    if os.path.isfile(csv_path):
        os.remove(csv_path)

    return {"deleted": name}

# ── Results ────────────────────────────────────────────────────────────────────

@app.get("/results/{watchlist}")
async def get_results(
    watchlist: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Return the most recent scan results for a watchlist."""
    wl  = await _get_watchlist_or_404(watchlist, current_user, db)
    run = await _get_latest_run(wl.id, db)
    if not run:
        raise HTTPException(404, f"No scan results for '{watchlist}' yet — run a scan first")
    results = await _get_run_results(run.id, db)
    return _format_results(watchlist, run, results)


@app.get("/history/{watchlist}")
async def get_history(
    watchlist: str,
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """List past scan run metadata (timestamps, counts) for a watchlist."""
    wl = await _get_watchlist_or_404(watchlist, current_user, db)
    result = await db.execute(
        select(ScanRun)
        .where(ScanRun.watchlist_id == wl.id)
        .order_by(desc(ScanRun.scanned_at))
        .limit(min(limit, 90))
    )
    runs = result.scalars().all()
    return [
        {"id": r.id, "scanned_at": r.scanned_at, "ticker_count": r.ticker_count}
        for r in runs
    ]


@app.get("/history/{watchlist}/{run_id}")
async def get_historical_results(
    watchlist: str,
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Return scan results for a specific historical run id."""
    wl = await _get_watchlist_or_404(watchlist, current_user, db)
    result = await db.execute(
        select(ScanRun).where(ScanRun.id == run_id, ScanRun.watchlist_id == wl.id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, f"Run {run_id} not found for watchlist '{watchlist}'")
    results = await _get_run_results(run.id, db)
    return _format_results(watchlist, run, results)

# ── Scan ───────────────────────────────────────────────────────────────────────

@app.post("/scan")
async def trigger_scan(current_user: User = Depends(get_current_user)):
    """Invoke the Scanner Lambda asynchronously (fire-and-forget)."""
    if not SCANNER_LAMBDA_NAME:
        raise HTTPException(503, "SCANNER_LAMBDA_NAME not configured")
    try:
        client  = boto3.client("lambda", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
        payload = {"user_id": str(current_user.id), "cognito_sub": current_user.cognito_sub}
        client.invoke(
            FunctionName=SCANNER_LAMBDA_NAME,
            InvocationType="Event",   # async — returns immediately
            Payload=json.dumps(payload).encode(),
        )
        return {"status": "scan started", "triggered_by": current_user.email}
    except Exception as exc:
        logger.exception("Failed to invoke Scanner Lambda")
        raise HTTPException(500, str(exc))


@app.get("/scan/status")
async def scan_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession   = Depends(get_db),
):
    """Most recent scan run across all of the user's watchlists."""
    result = await db.execute(
        select(ScanRun, Watchlist.name.label("wl_name"))
        .join(Watchlist, ScanRun.watchlist_id == Watchlist.id)
        .where(Watchlist.user_id == current_user.id)
        .order_by(desc(ScanRun.scanned_at))
        .limit(1)
    )
    row = result.first()
    if not row:
        return {"last_scan": None}
    run, wl_name = row
    return {
        "last_scan":    run.scanned_at,
        "watchlist":    wl_name,
        "ticker_count": run.ticker_count,
    }

# ── Debug ──────────────────────────────────────────────────────────────────────

@app.get("/debug/{ticker}")
async def debug_ticker(ticker: str, _: User = Depends(get_current_user)):
    """Download one ticker via yfinance and return raw diagnostics."""
    import numpy as np
    import pandas as pd
    import yfinance as yf

    symbol = ticker if (ticker.endswith(".NS") or ticker.endswith(".BO")) else ticker + ".NS"
    try:
        df = yf.download(symbol, period="2y", interval="1d", progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)
        if df.empty:
            return {"ticker": symbol, "rows": 0, "error": "empty dataframe"}
        close = float(df["Close"].iloc[-1])
        sma   = float(df["Close"].rolling(20).mean().iloc[-1])
        tp    = (df["High"] + df["Low"] + df["Close"]) / 3
        cci   = float(
            ((tp - tp.rolling(20).mean())
             / (0.015 * tp.rolling(20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True))
             ).iloc[-1]
        )
        return {
            "ticker": symbol, "rows": len(df),
            "close": close, "sma_20": sma, "cci_20": cci,
            "has_nan": any(np.isnan(v) for v in [close, sma, cci]),
        }
    except Exception as exc:
        return {"ticker": symbol, "error": str(exc)}

# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_watchlist_or_404(name: str, user: User, db: AsyncSession) -> Watchlist:
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == user.id, Watchlist.name == name)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(404, f"Watchlist '{name}' not found")
    return wl


async def _get_latest_run(watchlist_id: int, db: AsyncSession) -> ScanRun | None:
    result = await db.execute(
        select(ScanRun)
        .where(ScanRun.watchlist_id == watchlist_id)
        .order_by(desc(ScanRun.scanned_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_run_results(run_id: int, db: AsyncSession) -> list[ScanResult]:
    result = await db.execute(
        select(ScanResult).where(ScanResult.scan_run_id == run_id)
    )
    return list(result.scalars().all())


def _format_results(watchlist: str, run: ScanRun, rows: list[ScanResult]) -> dict:
    return {
        "watchlist":  watchlist,
        "scanned_at": run.scanned_at.isoformat() + "Z",
        "results": [
            {
                "Ticker":         r.ticker,
                "Close":          float(r.close)          if r.close          is not None else None,
                "CCI_20":         float(r.cci_20)         if r.cci_20         is not None else None,
                "SMA_20":         float(r.sma_20)         if r.sma_20         is not None else None,
                "Yearly_Low":     float(r.yearly_low)     if r.yearly_low     is not None else None,
                "Monthly_Low":    float(r.monthly_low)    if r.monthly_low    is not None else None,
                "Weekly_Low":     float(r.weekly_low)     if r.weekly_low     is not None else None,
                "Pct_From_Y_Low": float(r.pct_from_y_low) if r.pct_from_y_low is not None else None,
                "Pct_From_M_Low": float(r.pct_from_m_low) if r.pct_from_m_low is not None else None,
                "Pct_From_W_Low": float(r.pct_from_w_low) if r.pct_from_w_low is not None else None,
                "Near_Y_Low":     r.near_y_low,
                "Near_M_Low":     r.near_m_low,
                "Near_W_Low":     r.near_w_low,
                "CCI_History":    r.cci_history or [],
            }
            for r in rows
        ],
    }
