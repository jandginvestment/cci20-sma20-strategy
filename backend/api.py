import os
from datetime import timedelta
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.exceptions import DocumentNotFoundException

_cluster = None
_collection = None

def get_collection():
    global _cluster, _collection
    if _collection is None:
        auth = PasswordAuthenticator(os.environ['CB_USERNAME'], os.environ['CB_PASSWORD'])
        _cluster = Cluster(os.environ['CB_CONN_STR'], ClusterOptions(auth))
        _cluster.wait_until_ready(timedelta(seconds=10))
        _collection = _cluster.bucket('scan-results').default_collection()
    return _collection, _cluster

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

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/watchlists")
def get_watchlists():
    try:
        col, _ = get_collection()
        result = col.get('index::watchlists')
        return result.content_as[dict].get('watchlists', [])
    except DocumentNotFoundException:
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/{watchlist}")
def get_results(watchlist: str):
    try:
        col, _ = get_collection()
        result = col.get(f'results::{watchlist}')
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
    background_tasks.add_task(run_scan, watchlists_dir)
    return {"status": "scan started"}

def run_scan(watchlists_dir: str):
    from scanner import run_scanner
    run_scanner(watchlists_dir)
