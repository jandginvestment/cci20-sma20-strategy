import { Component, input, OnInit, inject, signal, computed } from '@angular/core';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SignalBadgeComponent } from '../../shared/components/signal-badge/signal-badge.component';
import { SparklineComponent } from '../../shared/components/sparkline/sparkline.component';
import { WatchlistService, SignalResult } from '../../core/api/watchlist.service';
import { RouterModule } from '@angular/router';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, SignalBadgeComponent, SparklineComponent, RouterModule, DecimalPipe],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="page-container">
          <div class="header-row">
            <div>
              <h1>Watchlist: {{ name() }}</h1>
              <p class="subtitle">Scanned: {{ scannedAt() || 'Never' }}</p>
            </div>
            <a [routerLink]="['/history', name()]" class="btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              History
            </a>
          </div>

          <div class="filters">
            <div class="filter-group">
              <button class="chip" [class.active]="lowFilter() === 'all'" (click)="lowFilter.set('all')">All</button>
              <button class="chip" [class.active]="lowFilter() === 'yearly'" (click)="lowFilter.set('yearly')">Near Yearly Low</button>
              <button class="chip" [class.active]="lowFilter() === 'monthly'" (click)="lowFilter.set('monthly')">Near Monthly Low</button>
              <button class="chip" [class.active]="lowFilter() === 'weekly'" (click)="lowFilter.set('weekly')">Near Weekly Low</button>
            </div>
            <div class="filter-group">
              <button class="chip" [class.active]="signalFilter() === 'all'" (click)="signalFilter.set('all')">All Signals</button>
              <button class="chip chip-reversal" [class.active]="signalFilter() === 'reversal'" (click)="signalFilter.set('reversal')">Reversal Zone</button>
              <button class="chip chip-recovery" [class.active]="signalFilter() === 'recovery'" (click)="signalFilter.set('recovery')">Recovery</button>
              <button class="chip chip-momentum" [class.active]="signalFilter() === 'momentum'" (click)="signalFilter.set('momentum')">Bullish Setup</button>
              <button class="chip chip-overbought" [class.active]="signalFilter() === 'overbought'" (click)="signalFilter.set('overbought')">Overbought</button>
            </div>
          </div>

          <div class="card table-card">
            @if (loading()) {
              <div class="skeleton-table">
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="skeleton-row skeleton"></div>
                }
              </div>
            } @else if (filteredResults().length === 0) {
              <div class="empty-state">
                <p>No results found for current filters.</p>
              </div>
            } @else {
              <div class="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Signal</th>
                      <th>Close</th>
                      <th>CCI(20)</th>
                      <th>vs SMA</th>
                      <th>Yearly Low%</th>
                      <th>Monthly Low%</th>
                      <th>Weekly Low%</th>
                      <th>CCI History</th>
                      <th>Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredResults(); track row.ticker) {
                      <tr>
                        <td class="font-medium">{{ row.ticker }}</td>
                        <td><app-signal-badge [type]="getSignalType(row)"></app-signal-badge></td>
                        <td>{{ row.close | number:'1.2-2' }}</td>
                        <td [class.text-success]="row.cci_20 > 0" [class.text-danger]="row.cci_20 < 0">{{ row.cci_20 | number:'1.2-2' }}</td>
                        <td>
                          @if (row.close >= row.sma_20) {
                            <span class="text-success">Above</span>
                          } @else {
                            <span class="text-danger">Below</span>
                          }
                        </td>
                        <td>{{ row.yearly_low_pct | number:'1.1-1' }}%</td>
                        <td>{{ row.monthly_low_pct | number:'1.1-1' }}%</td>
                        <td>{{ row.weekly_low_pct | number:'1.1-1' }}%</td>
                        <td><app-sparkline [values]="row.cci_history"></app-sparkline></td>
                        <td>
                          <a [href]="'https://in.tradingview.com/chart/?symbol=NSE:' + row.ticker.replace('.NS', '')" target="_blank" class="tv-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.25rem; }
    .subtitle { color: var(--text-secondary); font-size: 0.875rem; }
    
    .filters { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
    .filter-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .chip { 
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); 
      color: var(--text-secondary); padding: 0.375rem 1rem; border-radius: 9999px; 
      font-size: 0.875rem; cursor: pointer; transition: all 0.2s; 
    }
    .chip:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .chip.active.chip-reversal { background: var(--danger); border-color: var(--danger); }
    .chip.active.chip-recovery { background: var(--warning); border-color: var(--warning); color: #000; }
    .chip.active.chip-momentum { background: var(--success); border-color: var(--success); }
    .chip.active.chip-overbought { background: var(--purple); border-color: var(--purple); }
    
    .table-card { padding: 0; overflow: hidden; }
    .table-responsive { width: 100%; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-glow); white-space: nowrap; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 600; background: rgba(0,0,0,0.2); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .font-medium { font-weight: 500; color: var(--text-primary); }
    .text-success { color: var(--success); }
    .text-danger { color: var(--danger); }
    .tv-link { color: var(--text-secondary); }
    .tv-link:hover { color: var(--accent); }
    
    .skeleton-table { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-row { height: 40px; border-radius: 4px; }
    .empty-state { padding: 3rem; text-align: center; color: var(--text-secondary); }
  `]
})
export class WatchlistComponent implements OnInit {
  private watchlistService = inject(WatchlistService);
  
  name = input.required<string>();
  
  loading = signal(true);
  results = signal<SignalResult[]>([]);
  scannedAt = signal('');
  
  lowFilter = signal<'all'|'yearly'|'monthly'|'weekly'>('all');
  signalFilter = signal<'all'|'reversal'|'recovery'|'momentum'|'overbought'>('all');

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    this.loading.set(true);
    this.watchlistService.getResults(this.name()).subscribe({
      next: (res) => {
        this.results.set(res.results || []);
        this.scannedAt.set(res.scanned_at);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getSignalType(row: SignalResult): string {
    const oversold = row.cci_20 < -100;
    const recovering = row.cci_20 >= -100 && row.cci_20 <= 0;
    const positive = row.cci_20 > 0 && row.cci_20 <= 100;
    const overbought = row.cci_20 > 100;
    const aboveSMA = row.close >= row.sma_20;
    const belowSMA = row.close < row.sma_20;

    if (oversold && belowSMA) return 'reversal';
    if (recovering && aboveSMA) return 'recovery';
    if (positive && aboveSMA) return 'momentum';
    if (overbought && aboveSMA) return 'overbought';
    return 'neutral';
  }

  filteredResults = computed(() => {
    let res = this.results();
    
    // Low Filter
    const lf = this.lowFilter();
    if (lf === 'yearly') res = res.filter(r => r.yearly_low_pct <= 10);
    else if (lf === 'monthly') res = res.filter(r => r.monthly_low_pct <= 5);
    else if (lf === 'weekly') res = res.filter(r => r.weekly_low_pct <= 2);
    
    // Signal Filter
    const sf = this.signalFilter();
    if (sf !== 'all') {
      res = res.filter(r => this.getSignalType(r) === sf);
    }
    
    return res;
  });
}
