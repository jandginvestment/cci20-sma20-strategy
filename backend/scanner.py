import os
import datetime
import pandas as pd
import yfinance as yf
import numpy as np
from tqdm import tqdm
from datetime import timedelta

def get_cb_collection():
    from couchbase.cluster import Cluster
    from couchbase.options import ClusterOptions
    from couchbase.auth import PasswordAuthenticator
    auth = PasswordAuthenticator(os.environ['CB_USERNAME'], os.environ['CB_PASSWORD'])
    cluster = Cluster(os.environ['CB_CONN_STR'], ClusterOptions(auth))
    cluster.wait_until_ready(timedelta(seconds=10))
    return cluster.bucket('scan-results').default_collection()

def process_watchlist(watchlist_path, collection):
    try:
        df_watch = pd.read_csv(watchlist_path)
        if 'ticker' in df_watch.columns:
            tickers = df_watch['ticker'].tolist()
        else:
            df_watch = pd.read_csv(watchlist_path, header=None)
            tickers = df_watch[0].tolist()
    except Exception as e:
        print(f"Error reading watchlist {watchlist_path}: {e}")
        return

    results = []
    print(f"Scanning {len(tickers)} tickers from {os.path.basename(watchlist_path)}...")

    for ticker in tqdm(tickers):
        if not isinstance(ticker, str): continue
        ticker_symbol = ticker.strip()
        if not ticker_symbol: continue

        if not ticker_symbol.endswith('.NS') and not ticker_symbol.endswith('.BO'):
            ticker_symbol += '.NS'

        try:
            df = yf.download(ticker_symbol, period="2y", interval="1d", progress=False, auto_adjust=True)

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)

            if df.empty or len(df) < 252:
                print(f"  SKIP {ticker_symbol}: rows={len(df)} (need 252+)")
                continue

            df['SMA_20'] = df['Close'].rolling(window=20).mean()

            typical_price = (df['High'] + df['Low'] + df['Close']) / 3
            sma_tp = typical_price.rolling(window=20).mean()
            mean_dev = typical_price.rolling(window=20).apply(
                lambda x: np.abs(x - x.mean()).mean(), raw=True
            )
            df['CCI_20'] = (typical_price - sma_tp) / (0.015 * mean_dev)

            latest_price = float(df['Close'].iloc[-1])
            cci_20      = float(df['CCI_20'].iloc[-1])
            sma_20      = float(df['SMA_20'].iloc[-1])

            # Skip if any key metric is NaN (insufficient data)
            if any(np.isnan(v) for v in [latest_price, cci_20, sma_20]):
                continue

            yearly_low  = float(df['Low'].rolling(window=252).min().iloc[-1])
            monthly_low = float(df['Low'].rolling(window=21).min().iloc[-1])
            weekly_low  = float(df['Low'].rolling(window=5).min().iloc[-1])

            pct_from_yearly  = ((latest_price - yearly_low)  / yearly_low)  * 100
            pct_from_monthly = ((latest_price - monthly_low) / monthly_low) * 100
            pct_from_weekly  = ((latest_price - weekly_low)  / weekly_low)  * 100

            cci_hist = [
                round(x, 1) if not np.isnan(x) else 0.0
                for x in df['CCI_20'].iloc[-20:].tolist()
            ]

            results.append({
                'Ticker':        ticker_symbol,
                'Close':         round(latest_price, 2),
                'CCI_20':        round(cci_20, 2),
                'SMA_20':        round(sma_20, 2),
                'Yearly_Low':    round(yearly_low, 2),
                'Monthly_Low':   round(monthly_low, 2),
                'Weekly_Low':    round(weekly_low, 2),
                'Pct_From_Y_Low': round(pct_from_yearly, 2),
                'Pct_From_M_Low': round(pct_from_monthly, 2),
                'Pct_From_W_Low': round(pct_from_weekly, 2),
                'Near_Y_Low':    bool(pct_from_yearly  <= 5.0),
                'Near_M_Low':    bool(pct_from_monthly <= 5.0),
                'Near_W_Low':    bool(pct_from_weekly  <= 5.0),
                'CCI_History':   cci_hist,
            })

        except Exception as e:
            print(f"  ERROR {ticker_symbol}: {e}")

    results.sort(key=lambda r: (r['Pct_From_Y_Low'], r['Pct_From_M_Low'], r['Pct_From_W_Low']))

    watchlist_name = os.path.splitext(os.path.basename(watchlist_path))[0]
    doc = {
        'watchlist':  watchlist_name,
        'results':    results,
        'scanned_at': datetime.datetime.utcnow().isoformat() + 'Z',
    }
    collection.upsert(f'results::{watchlist_name}', doc)
    print(f"Saved {len(results)} results for '{watchlist_name}' to Couchbase")
    return watchlist_name

def purge_existing(cluster, collection):
    """Delete all scan documents before inserting fresh data."""
    from couchbase.exceptions import DocumentNotFoundException
    try:
        result = cluster.query(
            "SELECT META().id AS doc_id FROM `scan-results`._default._default "
            "WHERE META().id LIKE 'results::%' OR META().id = 'index::watchlists'"
        )
        ids = [row['doc_id'] for row in result]
        for doc_id in ids:
            try:
                collection.remove(doc_id)
            except DocumentNotFoundException:
                pass
        print(f"Purged {len(ids)} existing documents from Couchbase")
    except Exception as e:
        print(f"Warning: purge step failed ({e}), proceeding with upsert")

def run_scanner(watchlists_dir):
    if not os.path.isdir(watchlists_dir):
        print(f"Error: {watchlists_dir} is not a valid directory.")
        return

    from couchbase.cluster import Cluster
    from couchbase.options import ClusterOptions
    from couchbase.auth import PasswordAuthenticator
    auth = PasswordAuthenticator(os.environ['CB_USERNAME'], os.environ['CB_PASSWORD'])
    cluster = Cluster(os.environ['CB_CONN_STR'], ClusterOptions(auth))
    cluster.wait_until_ready(timedelta(seconds=10))
    collection = cluster.bucket('scan-results').default_collection()

    purge_existing(cluster, collection)

    watchlist_names = []
    for filename in os.listdir(watchlists_dir):
        if filename.endswith('.csv'):
            name = process_watchlist(os.path.join(watchlists_dir, filename), collection)
            if name:
                watchlist_names.append({'name': name})

    collection.upsert('index::watchlists', {
        'watchlists': watchlist_names,
        'updated_at': datetime.datetime.utcnow().isoformat() + 'Z',
    })
    print(f"Index updated: {len(watchlist_names)} watchlists")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CCI/SMA Stock Scanner")
    parser.add_argument("--watchlists", default=r"c:\projects\shared_watchlists")
    args = parser.parse_args()
    run_scanner(args.watchlists)
