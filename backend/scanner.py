import os
import sys
import datetime
import pandas as pd
import yfinance as yf
import numpy as np
from tqdm import tqdm

# Ensure backend/ is on path so cb_client resolves from any working directory
_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)

from cb_client import (
    get_cluster, get_collection,
    result_key, INDEX_KEY, TIMESTAMP_FIELD, BUCKET_NAME,
)


def _read_tickers(watchlist_path: str) -> list[str]:
    """
    Read tickers from a CSV file robustly:
    - Handles both headered ('ticker') and headerless CSVs.
    - Strips surrounding quotes from values (e.g. '"RELIANCE.NS"' → 'RELIANCE.NS').
    - Skips blank or non-string rows.
    """
    try:
        df = pd.read_csv(watchlist_path)
        # Normalise: strip quotes from column names
        df.columns = [c.strip().strip('"').lower() for c in df.columns]
        if 'ticker' in df.columns:
            raw = df['ticker'].tolist()
        else:
            # No recognised header — re-read without header
            df = pd.read_csv(watchlist_path, header=None)
            raw = df[0].tolist()
    except Exception as e:
        print(f"Error reading watchlist {watchlist_path}: {e}")
        return []

    tickers = []
    for v in raw:
        if not isinstance(v, str):
            continue
        v = v.strip().strip('"')          # strip surrounding quotes
        if not v or v.lower() == 'ticker':  # skip blanks and duplicate headers
            continue
        tickers.append(v)
    return tickers


def process_watchlist(watchlist_path, collection):
    tickers = _read_tickers(watchlist_path)
    if not tickers:
        return None

    results = []
    print(f"Scanning {len(tickers)} tickers from {os.path.basename(watchlist_path)}...")

    for ticker in tqdm(tickers):
        ticker_symbol = ticker.strip()
        if not ticker_symbol:
            continue

        if not ticker_symbol.endswith('.NS') and not ticker_symbol.endswith('.BO'):
            ticker_symbol += '.NS'

        try:
            end_date = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=380)  # ~260 trading days
            df = yf.download(ticker_symbol, start=start_date, end=end_date, interval="1d", progress=False)

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)

            if df.empty or len(df) < 252:
                print(f"  SKIP {ticker_symbol}: rows={len(df)} cols={list(df.columns)}")
                continue

            df['SMA_20'] = df['Close'].rolling(window=20).mean()

            typical_price = (df['High'] + df['Low'] + df['Close']) / 3
            sma_tp = typical_price.rolling(window=20).mean()
            mean_dev = typical_price.rolling(window=20).apply(
                lambda x: np.abs(x - x.mean()).mean(), raw=True
            )
            df['CCI_20'] = (typical_price - sma_tp) / (0.015 * mean_dev)

            latest_price = float(df['Close'].iloc[-1])
            cci_20       = float(df['CCI_20'].iloc[-1])
            sma_20       = float(df['SMA_20'].iloc[-1])

            # Skip if any key metric is NaN (insufficient data)
            if any(np.isnan(v) for v in [latest_price, cci_20, sma_20]):
                print(f"  NaN {ticker_symbol}: price={latest_price} cci={cci_20} sma={sma_20}")
                continue

            yearly_low   = float(df['Low'].rolling(window=252).min().iloc[-1])
            monthly_low  = float(df['Low'].rolling(window=21).min().iloc[-1])
            weekly_low   = float(df['Low'].rolling(window=5).min().iloc[-1])

            pct_from_yearly  = ((latest_price - yearly_low)  / yearly_low)  * 100
            pct_from_monthly = ((latest_price - monthly_low) / monthly_low) * 100
            pct_from_weekly  = ((latest_price - weekly_low)  / weekly_low)  * 100

            cci_hist = [
                round(x, 1) if not np.isnan(x) else 0.0
                for x in df['CCI_20'].iloc[-20:].tolist()
            ]

            results.append({
                'Ticker':          ticker_symbol,
                'Close':           round(latest_price, 2),
                'CCI_20':          round(cci_20, 2),
                'SMA_20':          round(sma_20, 2),
                'Yearly_Low':      round(yearly_low, 2),
                'Monthly_Low':     round(monthly_low, 2),
                'Weekly_Low':      round(weekly_low, 2),
                'Pct_From_Y_Low':  round(pct_from_yearly, 2),
                'Pct_From_M_Low':  round(pct_from_monthly, 2),
                'Pct_From_W_Low':  round(pct_from_weekly, 2),
                'Near_Y_Low':      bool(pct_from_yearly  <= 5.0),
                'Near_M_Low':      bool(pct_from_monthly <= 5.0),
                'Near_W_Low':      bool(pct_from_weekly  <= 5.0),
                'CCI_History':     cci_hist,
            })

        except Exception as e:
            print(f"  ERROR {ticker_symbol}: {e}")

    results.sort(key=lambda r: (r['Pct_From_Y_Low'], r['Pct_From_M_Low'], r['Pct_From_W_Low']))

    watchlist_name = os.path.splitext(os.path.basename(watchlist_path))[0]
    doc = {
        'watchlist':      watchlist_name,
        'results':        results,
        TIMESTAMP_FIELD:  datetime.datetime.utcnow().isoformat() + 'Z',
    }
    collection.upsert(result_key(watchlist_name), doc)
    print(f"Saved {len(results)} results for '{watchlist_name}' to Couchbase")
    return watchlist_name


def purge_existing(cluster, collection):
    """Delete all scan documents before inserting fresh data."""
    from couchbase.exceptions import DocumentNotFoundException
    try:
        result = cluster.query(
            f"SELECT META().id AS doc_id FROM `{BUCKET_NAME}`._default._default "
            f"WHERE META().id LIKE 'results::%' OR META().id = '{INDEX_KEY}'"
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

    cluster    = get_cluster()
    collection = get_collection(cluster)

    purge_existing(cluster, collection)

    watchlist_names = []
    for filename in os.listdir(watchlists_dir):
        if filename.endswith('.csv'):
            name = process_watchlist(os.path.join(watchlists_dir, filename), collection)
            if name:
                watchlist_names.append({'name': name})

    collection.upsert(INDEX_KEY, {
        'watchlists':    watchlist_names,
        TIMESTAMP_FIELD: datetime.datetime.utcnow().isoformat() + 'Z',
    })
    print(f"Index updated: {len(watchlist_names)} watchlists")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="CCI/SMA Stock Scanner")
    parser.add_argument("--watchlists", default=r"c:\projects\shared_watchlists")
    args = parser.parse_args()
    run_scanner(args.watchlists)
