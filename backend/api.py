import os
from datetime import timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.auth import PasswordAuthenticator
from couchbase.exceptions import DocumentNotFoundException

_collection = None

def get_collection():
    global _collection
    if _collection is None:
        auth = PasswordAuthenticator(os.environ['CB_USERNAME'], os.environ['CB_PASSWORD'])
        cluster = Cluster(os.environ['CB_CONN_STR'], ClusterOptions(auth))
        cluster.wait_until_ready(timedelta(seconds=10))
        _collection = cluster.bucket('scan-results').default_collection()
    return _collection

app = FastAPI(title="CCI/SMA Scanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://jandginvestment.github.io",
        "http://localhost:4200",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/watchlists")
def get_watchlists():
    try:
        result = get_collection().get('index::watchlists')
        return result.content_as[dict].get('watchlists', [])
    except DocumentNotFoundException:
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results/{watchlist}")
def get_results(watchlist: str):
    try:
        result = get_collection().get(f'results::{watchlist}')
        return result.content_as[dict]
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail=f"No results found for '{watchlist}'")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
