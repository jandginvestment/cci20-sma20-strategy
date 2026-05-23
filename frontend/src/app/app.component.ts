import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

export interface ScanResult {
  Ticker: string;
  Close: number;
  CCI_20: number;
  SMA_20: number;
  Yearly_Low: number;
  Monthly_Low: number;
  Weekly_Low: number;
  Pct_From_Y_Low: number;
  Pct_From_M_Low: number;
  Pct_From_W_Low: number;
  Near_Y_Low: boolean;
  Near_M_Low: boolean;
  Near_W_Low: boolean;
  CCI_History: number[];
  sparkline: { path: string, zero: string };
}

/** Four meaningful CCI + SMA combination signals */
export type SignalType = 'reversal' | 'recovery' | 'momentum' | 'overbought' | 'neutral';

export interface Signal {
  type: SignalType;
  label: string;
  title: string;
}

export interface Watchlist {
  name: string;
  file: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  watchlists: Watchlist[] = [];
  activeWatchlist: Watchlist | null = null;
  isSidebarCollapsed = false;
  
  results: ScanResult[] = [];
  loading = true;
  error = '';
  lastUpdated = new Date();

  activeFilter: 'all' | 'year' | 'month' | 'week' = 'all';
  activeSignalFilter: SignalType | 'all' = 'all';

  sortColumn: string = 'Pct_From_Y_Low';
  sortDir: 'asc' | 'desc' = 'asc';

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  ngOnInit() { this.fetchWatchlists(); }

  async fetchWatchlists() {
    this.loading = true;
    try {
      const cacheBuster = `?t=${new Date().getTime()}`;
      const response = await fetch('assets/data/watchlists.json' + cacheBuster);
      if (!response.ok) throw new Error('Could not fetch watchlists.json');
      this.watchlists = await response.json();
      if (this.watchlists.length > 0) {
        this.loadWatchlist(this.watchlists[0]);
      } else {
        this.loading = false;
        this.error = 'No watchlists found.';
      }
    } catch (e: any) {
      this.error = 'Failed to load watchlists: ' + e.message;
      this.loading = false;
    }
  }

  async loadWatchlist(wl: Watchlist) {
    this.activeWatchlist = wl;
    this.loading = true;
    this.error = '';
    try {
      const cacheBuster = `?t=${new Date().getTime()}`;
      const response = await fetch('assets/data/' + wl.file + cacheBuster);
      if (!response.ok) throw new Error('Could not fetch ' + wl.file);
      const csvText = await response.text();
      this.parseCSV(csvText);
      this.lastUpdated = new Date();
      this.loading = false;
    } catch (e: any) {
      this.error = e.message;
      this.loading = false;
    }
  }

  parseCSV(csv: string) {
    const lines = csv.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) return;
    const data: ScanResult[] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < 13) continue;
      const scanObj: any = {
        Ticker: row[0],
        Close: parseFloat(row[1]),
        CCI_20: parseFloat(row[2]),
        SMA_20: parseFloat(row[3]),
        Yearly_Low: parseFloat(row[4]),
        Monthly_Low: parseFloat(row[5]),
        Weekly_Low: parseFloat(row[6]),
        Pct_From_Y_Low: parseFloat(row[7]),
        Pct_From_M_Low: parseFloat(row[8]),
        Pct_From_W_Low: parseFloat(row[9]),
        Near_Y_Low: row[10].trim() === 'True',
        Near_M_Low: row[11].trim() === 'True',
        Near_W_Low: row[12].trim() === 'True',
      };
      
      const history = (row[13] || '').split('|').map(v => parseFloat(v)).filter(v => !isNaN(v));
      scanObj.CCI_History = history;
      scanObj.sparkline = this.generateSparkline(history);
      
      data.push(scanObj as ScanResult);
    }
    this.results = data;
  }

  generateSparkline(values: number[]): { path: string, zero: string } {
    if (!values || values.length < 2) return { path: '', zero: '10' };
    const width = 50;
    const height = 20;
    
    // Calculate extents, keeping at least -150 to 150 context
    const min = Math.min(...values, -150);
    const max = Math.max(...values, 150);
    const range = max - min || 1;
    
    let path = '';
    for (let i = 0; i < values.length; i++) {
        const val = values[i];
        const x = (i / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    
    const zeroY = height - ((0 - min) / range) * height;
    return { path: path.trim(), zero: zeroY.toFixed(1) };
  }

  // ── Stat counts ───────────────────────────────────────
  get nearYLowCount() { return this.results.filter(r => r.Near_Y_Low).length; }
  get nearMLowCount() { return this.results.filter(r => r.Near_M_Low).length; }
  get nearWLowCount() { return this.results.filter(r => r.Near_W_Low).length; }

  // ── Filter ────────────────────────────────────────────
  get filteredResults(): ScanResult[] {
    let current = this.results;

    // Timeframe Filter
    switch (this.activeFilter) {
      case 'year':  current = current.filter(r => r.Near_Y_Low); break;
      case 'month': current = current.filter(r => r.Near_M_Low); break;
      case 'week':  current = current.filter(r => r.Near_W_Low); break;
    }

    // Signal Filter
    if (this.activeSignalFilter !== 'all') {
      current = current.filter(r => this.signal(r).type === this.activeSignalFilter);
    }

    return current;
  }

  setFilter(filter: 'all' | 'year' | 'month' | 'week') {
    this.activeFilter = this.activeFilter === filter ? 'all' : filter;
  }

  setSignalFilter(filter: SignalType | 'all') {
    this.activeSignalFilter = this.activeSignalFilter === filter ? 'all' : filter;
  }

  // ── Sort ──────────────────────────────────────────────
  sortBy(col: string) {
    if (this.sortColumn === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col;
      this.sortDir = 'asc';
    }
  }

  get displayedResults(): ScanResult[] {
    const data = [...this.filteredResults];
    if (!this.sortColumn) return data;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    return data.sort((a, b) => {
      const av = (a as any)[this.sortColumn];
      const bv = (b as any)[this.sortColumn];
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return ((av ?? 0) - (bv ?? 0)) * dir;
    });
  }

  sortIcon(col: string): string {
    if (this.sortColumn !== col) return 'sort-none';
    return this.sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
  }

  // ── CCI + SMA signal classifier ───────────────────────
  signal(row: ScanResult): Signal {
    const aboveSMA  = row.Close >= row.SMA_20;
    const belowSMA  = row.Close <  row.SMA_20;
    const oversold  = row.CCI_20 < -100;
    const recovering = row.CCI_20 >= -100 && row.CCI_20 < 0;
    const positive  = row.CCI_20 >= 0 && row.CCI_20 <= 100;
    const overbought = row.CCI_20 > 100;

    if (oversold && belowSMA)
      return {
        type: 'reversal',
        label: 'Reversal Zone',
        title: 'CCI < -100 & Price below SMA20 — oversold + below MA, watch for reversal candle'
      };

    if (recovering && aboveSMA)
      return {
        type: 'recovery',
        label: 'Recovery',
        title: 'CCI -100→0 & Price > SMA20 — price holding above MA while CCI climbs back'
      };

    if (positive && aboveSMA)
      return {
        type: 'momentum',
        label: 'Bullish Setup',
        title: 'CCI 0-100 & Price > SMA20 — positive momentum, price confirmed above MA'
      };

    if (overbought && aboveSMA)
      return {
        type: 'overbought',
        label: 'Overbought',
        title: 'CCI > 100 & Price > SMA20 — strong trend but near take-profit zone'
      };

    return { type: 'neutral', label: 'No Signal', title: 'No clear CCI+SMA combination signal' };
  }

  // ── Actions ────────────────────────────────────────────
  openTradingView(ticker: string) {
    let tvSymbol = ticker;
    if (ticker.endsWith('.NS')) {
      tvSymbol = 'NSE:' + ticker.replace('.NS', '');
    } else if (ticker.endsWith('.BO')) {
      tvSymbol = 'BSE:' + ticker.replace('.BO', '');
    } else {
      tvSymbol = 'NSE:' + ticker; // fallback
    }
    const encodedSymbol = encodeURIComponent(tvSymbol);
    const url = `https://www.tradingview.com/chart/b7xSVbGi/?symbol=${encodedSymbol}`;
    window.open(url, '_blank');
  }

  distPct(pct: number): number {
    const capped = Math.min(pct, 20);
    return Math.round((1 - capped / 20) * 100);
  }
}
