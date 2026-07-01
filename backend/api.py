import os
import sys
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from couchbase.exceptions import DocumentNotFoundException

# Support both: `uvicorn backend.api:app` (Railway, cwd=project root)
# and:          `uvicorn api:app`         (local, cwd=backend/)
_backend_dir = os.path.dirname(__file__)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from cb_client import get_cluster, get_collection, result_key, INDEX_KEY

# ── Singleton connection ──────────────────────────────────────────────────────
_cluster    = None
_collection = None

def _get_col():
    global _cluster, _collection
    if _collection is None:
        _cluster    = get_cluster()
        _collection = get_collection(_cluster)
    return _collection

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="CCI/SMA Scanner API", default_response_class=ORJSONResponse)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jandginvestment.github.io",
        "http://localhost:4200",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/watchlists")
def get_watchlists():
    try:
        col = _get_col()
        result = col.get(INDEX_KEY)
        return result.content_as[dict].get('watchlists', [])
    except DocumentNotFoundException:
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/{watchlist}")
def get_results(watchlist: str):
    try:
        col = _get_col()
        result = col.get(result_key(watchlist))
        return result.content_as[dict]
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail=f"No results found for '{watchlist}'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan")
def trigger_scan(background_tasks: BackgroundTasks):
    watchlists_dir = os.path.join(os.path.dirname(__file__), 'watchlists')
    if not os.path.isdir(watchlists_dir):
        raise HTTPException(status_code=500, detail=f"Watchlists directory not found: {watchlists_dir}")
    background_tasks.add_task(_run_scan, watchlists_dir)
    return {"status": "scan started"}

def _run_scan(watchlists_dir: str):
    from scanner import run_scanner   # backend_dir already on sys.path (see top)
    run_scanner(watchlists_dir)

@app.get("/debug/{ticker}")
def debug_ticker(ticker: str):
    """Download one ticker via yfinance and return raw diagnostics."""
    import yfinance as yf
    import pandas as pd
    import numpy as np
    symbol = ticker if (ticker.endswith('.NS') or ticker.endswith('.BO')) else ticker + '.NS'
    try:
        df = yf.download(symbol, period="2y", interval="1d", progress=False)
        if isinstance(df.columns, pd.MultiIndex):
            col_info = f"MultiIndex {df.columns.names}"
            df.columns = df.columns.droplevel(1)
        else:
            col_info = "flat"
        if df.empty:
            return {"ticker": symbol, "rows": 0, "cols": col_info, "error": "empty dataframe"}
        close = float(df['Close'].iloc[-1])
        sma = float(df['Close'].rolling(20).mean().iloc[-1])
        tp = (df['High'] + df['Low'] + df['Close']) / 3
        cci = float(((tp - tp.rolling(20).mean()) / (0.015 * tp.rolling(20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True))).iloc[-1])
        return {
            "ticker": symbol,
            "rows": len(df),
            "cols": col_info,
            "close": close,
            "sma_20": sma,
            "cci_20": cci,
            "has_nan": any(np.isnan(v) for v in [close, sma, cci]),
        }
    except Exception as e:
        return {"ticker": symbol, "error": str(e)}
