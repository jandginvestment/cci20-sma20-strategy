"""Quick local debug: test yfinance download for a handful of nifty50 tickers."""
import yfinance as yf
import numpy as np
import pandas as pd

TEST_TICKERS = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ITC.NS", "SBIN.NS", "BEL.NS", "GRSE.NS"]

for ticker in TEST_TICKERS:
    try:
        df = yf.download(ticker, period="2y", interval="1d", progress=False)

        if isinstance(df.columns, pd.MultiIndex):
            print(f"{ticker}: MultiIndex levels={df.columns.names}, dropping level 1")
            df.columns = df.columns.droplevel(1)
        else:
            print(f"{ticker}: flat columns={list(df.columns)}")

        if df.empty:
            print(f"  -> EMPTY dataframe")
            continue

        print(f"  -> rows={len(df)}, cols={list(df.columns)}")

        if len(df) < 252:
            print(f"  -> SKIP: only {len(df)} rows (need 252+)")
            continue

        close = df['Close'].iloc[-1]
        sma_20 = df['Close'].rolling(20).mean().iloc[-1]
        tp = (df['High'] + df['Low'] + df['Close']) / 3
        mean_dev = tp.rolling(20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
        cci = (tp - tp.rolling(20).mean()) / (0.015 * mean_dev)
        cci_val = cci.iloc[-1]

        print(f"  -> close={close:.2f}  sma={sma_20:.2f}  cci={cci_val:.2f}")

        if any(np.isnan(v) for v in [float(close), float(cci_val), float(sma_20)]):
            print(f"  -> NaN detected — would be skipped")
        else:
            print(f"  -> OK — would be included in results")

    except Exception as e:
        print(f"{ticker}: EXCEPTION — {e}")

print("\nDone.")
