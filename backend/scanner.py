import os
import pandas as pd
import yfinance as yf
import numpy as np
from tqdm import tqdm

def process_watchlist(watchlist_path, output_dir):
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
        # Adding .NS if not present
        if not isinstance(ticker, str): continue
        ticker_symbol = ticker.strip()
        if not ticker_symbol: continue
        
        # Append .NS suffix for NSE stocks if missing
        if not ticker_symbol.endswith('.NS') and not ticker_symbol.endswith('.BO'):
            # Some watchlist formats might have the ticker differently, assume .NS
            ticker_symbol += '.NS'
            
        try:
            # Download 2 years of data to ensure enough data for 1 year low (252 days)
            df = yf.download(ticker_symbol, period="2y", interval="1d", progress=False)
            
            # Yfinance sometimes returns MultiIndex columns, let's flatten or get Price level if needed
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)
                
            if df.empty or len(df) < 252:
                continue

            # Manual SMA calculation
            df['SMA_20'] = df['Close'].rolling(window=20).mean()
            
            # Manual CCI calculation
            typical_price = (df['High'] + df['Low'] + df['Close']) / 3
            sma_tp = typical_price.rolling(window=20).mean()
            # Mean deviation
            # Use sum of absolute differences divided by 20 to avoid deprecated mad()
            mean_dev = typical_price.rolling(window=20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
            df['CCI_20'] = (typical_price - sma_tp) / (0.015 * mean_dev)

            # Latest values
            latest_price = df['Close'].iloc[-1]
            cci_20 = df['CCI_20'].iloc[-1]
            sma_20 = df['SMA_20'].iloc[-1]
            
            # Low calculations (Trading days: 1 yr ~ 252, 1 mo ~ 21, 1 wk ~ 5)
            yearly_low = df['Low'].rolling(window=252).min().iloc[-1]
            monthly_low = df['Low'].rolling(window=21).min().iloc[-1]
            weekly_low = df['Low'].rolling(window=5).min().iloc[-1]

            # Distances from lows in percentage
            pct_from_yearly = ((latest_price - yearly_low) / yearly_low) * 100
            pct_from_monthly = ((latest_price - monthly_low) / monthly_low) * 100
            pct_from_weekly = ((latest_price - weekly_low) / weekly_low) * 100

            # Signal flags based on distance from low (e.g. within 5% is a "Near Low" signal)
            near_yearly_low = pct_from_yearly <= 5.0
            near_monthly_low = pct_from_monthly <= 5.0
            near_weekly_low = pct_from_weekly <= 5.0

            # 20-day CCI history for sparkline
            cci_hist_series = df['CCI_20'].iloc[-20:]
            cci_hist_str = "|".join([str(round(x, 1)) if not np.isnan(x) else "0" for x in cci_hist_series])

            results.append({
                'Ticker': ticker_symbol,
                'Close': round(latest_price, 2),
                'CCI_20': round(cci_20, 2),
                'SMA_20': round(sma_20, 2),
                'Yearly_Low': round(yearly_low, 2),
                'Monthly_Low': round(monthly_low, 2),
                'Weekly_Low': round(weekly_low, 2),
                '%_From_Y_Low': round(pct_from_yearly, 2),
                '%_From_M_Low': round(pct_from_monthly, 2),
                '%_From_W_Low': round(pct_from_weekly, 2),
                'Near_Y_Low': near_yearly_low,
                'Near_M_Low': near_monthly_low,
                'Near_W_Low': near_weekly_low,
                'CCI_History': cci_hist_str
            })
            
        except Exception as e:
            # print(f"Error processing {ticker}: {e}")
            pass

    if results:
        res_df = pd.DataFrame(results)
        
        # Sort by those near yearly low, then monthly, then weekly
        res_df = res_df.sort_values(by=['%_From_Y_Low', '%_From_M_Low', '%_From_W_Low'])
    else:
        res_df = pd.DataFrame(columns=[
            'Ticker', 'Close', 'CCI_20', 'SMA_20', 'Yearly_Low', 'Monthly_Low', 
            'Weekly_Low', '%_From_Y_Low', '%_From_M_Low', '%_From_W_Low', 
            'Near_Y_Low', 'Near_M_Low', 'Near_W_Low', 'CCI_History'
        ])
        print(f"No results generated for {os.path.basename(watchlist_path)}. Generating empty file.")

    # Create output dir if needed
    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(watchlist_path))[0]
    out_file = os.path.join(output_dir, f'{base_name}_results.csv')
    res_df.to_csv(out_file, index=False)
    print(f"Results saved to {out_file}")

def run_scanner(watchlists_dir, output_dir):
    if not os.path.isdir(watchlists_dir):
        print(f"Error: {watchlists_dir} is not a valid directory.")
        return
        
    generated_files = []
    import glob
    import json
    
    for filename in os.listdir(watchlists_dir):
        if filename.endswith('.csv'):
            watchlist_path = os.path.join(watchlists_dir, filename)
            process_watchlist(watchlist_path, output_dir)
            
            base_name = os.path.splitext(filename)[0]
            generated_files.append({
                "name": base_name,
                "file": f"{base_name}_results.csv"
            })
            
    # Output an index JSON for the Angular frontend
    os.makedirs(output_dir, exist_ok=True)
    index_file = os.path.join(output_dir, 'watchlists.json')
    with open(index_file, 'w') as f:
        json.dump(generated_files, f)
    print(f"Index mapped {len(generated_files)} watchlists into {index_file}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="CCI/SMA Stock Scanner")
    parser.add_argument(
        "--watchlists",
        default=r"c:\projects\shared_watchlists",
        help="Directory containing watchlist CSV files"
    )
    parser.add_argument(
        "--output",
        default=r"c:\projects\cci20_sma20_strategy\frontend\src\assets\data",
        help="Directory to write result CSVs and watchlists.json"
    )
    args = parser.parse_args()
    run_scanner(args.watchlists, args.output)
