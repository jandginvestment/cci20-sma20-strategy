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
