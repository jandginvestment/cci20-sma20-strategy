"""
Shared Couchbase connection factory.
Single source of truth for connection credentials, bucket name,
document key patterns, and timeout — used by both scanner.py and api.py.
"""
import os
from datetime import timedelta

BUCKET_NAME    = "scan-results"
CB_TIMEOUT_SEC = int(os.environ.get("CB_TIMEOUT_SECONDS", "10"))

# Document key helpers
def result_key(watchlist_name: str) -> str:
    return f"results::{watchlist_name}"

INDEX_KEY = "index::watchlists"

# Timestamp field name — consistent across ALL documents
TIMESTAMP_FIELD = "scanned_at"


def get_cluster():
    """Return a ready Couchbase Cluster (new connection each call — use for scanner)."""
    from couchbase.cluster import Cluster
    from couchbase.options import ClusterOptions
    from couchbase.auth import PasswordAuthenticator
    auth = PasswordAuthenticator(os.environ['CB_USERNAME'], os.environ['CB_PASSWORD'])
    cluster = Cluster(os.environ['CB_CONN_STR'], ClusterOptions(auth))
    cluster.wait_until_ready(timedelta(seconds=CB_TIMEOUT_SEC))
    return cluster


def get_collection(cluster=None):
    """Return the default collection. Creates its own cluster if none given."""
    if cluster is None:
        cluster = get_cluster()
    return cluster.bucket(BUCKET_NAME).default_collection()
