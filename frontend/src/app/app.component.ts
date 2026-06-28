import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

const API_URL = 'https://cci20-sma20-api-production.up.railway.app';

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

  private async apiFetch(path: string): Promise<any> {
    const response = await fetch(`${API_URL}${path}`);
    if (!response.ok) throw new Error(`API error (${response.status}): ${path}`);
    return response.json();
  }

  async fetchWatchlists() {
    this.loading = true;
    try {
      this.watchlists = await this.apiFetch('/watchlists');
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
      const doc = await this.apiFetch(`/results/${wl.name}`);
      this.results = (doc.results ?? []).map((r: any) => ({
        ...r,
        sparkline: this.generateSparkline(r.CCI_History ?? [])
      }));
      this.lastUpdated = doc.scanned_at ? new Date(doc.scanned_at) : new Date();
      this.loading = false;
    } catch (e: any) {
      this.error = e.message;
      this.loading = false;
    }
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
    let tvSymbol: string;
    if (ticker.endsWith('.NS')) {
      tvSymbol = 'NSE:' + ticker.replace('.NS', '');
    } else if (ticker.endsWith('.BO')) {
      tvSymbol = 'BSE:' + ticker.replace('.BO', '');
    } else {
      tvSymbol = 'NSE:' + ticker;
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
