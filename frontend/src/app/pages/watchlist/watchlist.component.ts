import { Component, input, inject, signal, computed } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SignalBadgeComponent } from '../../shared/components/signal-badge/signal-badge.component';
import { SparklineComponent } from '../../shared/components/sparkline/sparkline.component';
import { WatchlistService, SignalResult } from '../../core/api/watchlist.service';
import { RouterModule } from '@angular/router';

type LowFilter = 'all' | 'yearly' | 'monthly' | 'weekly';
type SigFilter = 'all' | 'reversal' | 'recovery' | 'momentum' | 'overbought';
type SortCol   = 'ticker' | 'signal' | 'close' | 'cci_20' | 'sma_20'
               | 'yearly_low_pct' | 'monthly_low_pct' | 'weekly_low_pct';
type SortDir   = 'asc' | 'desc';

const SIG_ORDER: Record<string, number> = { reversal: 0, recovery: 1, momentum: 2, overbought: 3, neutral: 4 };

const YR_THR = 10, MO_THR = 5, WK_THR = 2;

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, SignalBadgeComponent, SparklineComponent,
            RouterModule, DecimalPipe, NgClass],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="page-container">

          <!-- Header -->
          <div class="d-flex align-items-flex-start justify-content-between mb-3">
            <div>
              <h4 class="mb-0 fw-bold page-name">{{ name() }}</h4>
              <small class="text-secondary">
                CCI(20) &amp; SMA(20) Strategy — Weekly · Monthly · Yearly Lows
                @if (scannedAt()) { &nbsp;·&nbsp; Scanned: {{ scannedAt() }} }
              </small>
            </div>
            <a [routerLink]="['/history', name()]" class="btn-ghost mt-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              History
            </a>
          </div>

          <!-- 1. Signal filter row (ABOVE stat cards) -->
          <div class="sig-filter-row mb-3">
            <span class="sig-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Signal:
            </span>
            <button class="sig-chip sig-reversal"  [class.active]="sigFilter()==='reversal'"  (click)="toggleSig('reversal')">Reversal Zone</button>
            <button class="sig-chip sig-recovery"  [class.active]="sigFilter()==='recovery'"  (click)="toggleSig('recovery')">Recovery</button>
            <button class="sig-chip sig-momentum"  [class.active]="sigFilter()==='momentum'"  (click)="toggleSig('momentum')">Bullish Setup</button>
            <button class="sig-chip sig-overbought"[class.active]="sigFilter()==='overbought'"(click)="toggleSig('overbought')">Overbought</button>
            @if (sigFilter() !== 'all') {
              <button class="clear-btn" (click)="sigFilter.set('all')" title="Clear signal filter">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            }
          </div>

          <!-- 2. Stat cards -->
          <div class="row g-2 mb-3">
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card" (click)="lowFilter.set('all')"
                   [class.stat-active]="lowFilter()==='all'">
                <div class="card-body stat-body">
                  <div class="stat-icon default">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-sub">All Stocks</div>
                    <div class="stat-num">{{ results().length }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card" (click)="toggleLow('yearly')"
                   [class.stat-active-yr]="lowFilter()==='yearly'">
                <div class="card-body stat-body">
                  <div class="stat-icon highlight">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-sub">Near 1-Yr Low <span class="thr">≤{{ YR_THR }}%</span></div>
                    <div class="stat-num yr-num">{{ countYearly() }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card" (click)="toggleLow('monthly')"
                   [class.stat-active-mo]="lowFilter()==='monthly'">
                <div class="card-body stat-body">
                  <div class="stat-icon neutral">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-sub">Near 1-Mo Low <span class="thr">≤{{ MO_THR }}%</span></div>
                    <div class="stat-num mo-num">{{ countMonthly() }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card" (click)="toggleLow('weekly')"
                   [class.stat-active-wk]="lowFilter()==='weekly'">
                <div class="card-body stat-body">
                  <div class="stat-icon trend-up">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 20 L12 20 L16 8 L20 32 L24 14 L28 22 L36 22"
                            transform="scale(0.6) translate(2,2)"/>
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-sub">Near 1-Wk Low <span class="thr">≤{{ WK_THR }}%</span></div>
                    <div class="stat-num wk-num">{{ countWeekly() }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Active filter badge -->
          @if (lowFilter() !== 'all') {
            <div class="filter-badge-row mb-3">
              <span class="active-badge" [class.badge-yr]="lowFilter()==='yearly'"
                    [class.badge-mo]="lowFilter()==='monthly'" [class.badge-wk]="lowFilter()==='weekly'">
                @if (lowFilter()==='yearly')  { ▲ Near 1-Year Low }
                @if (lowFilter()==='monthly') { 📅 Near 1-Month Low }
                @if (lowFilter()==='weekly')  { ⚡ Near 1-Week Low }
                — {{ displayedResults().length }} stocks
              </span>
              <button class="clear-btn" (click)="lowFilter.set('all')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <span class="rows-hint">{{ displayedResults().length }} rows · Tap header to sort</span>
            </div>
          }

          <!-- 4. Table -->
          <div class="card card-glass p-0 overflow-hidden">
            @if (loading()) {
              <div class="p-4">
                @for (i of [1,2,3,4,5,6,7]; track i) {
                  <div class="skeleton mb-3" style="height:40px;border-radius:6px;"></div>
                }
              </div>
            } @else if (displayedResults().length === 0) {
              <div class="p-5 text-center">
                <div style="font-size:2rem;margin-bottom:.75rem">📭</div>
                <p class="text-secondary mb-0">No results for the selected filters.</p>
              </div>
            } @else {
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0 scanner-table">
                  <thead>
                    <tr>
                      <th class="col-num">#</th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='ticker'"         (click)="sortBy('ticker')">TICKER <span class="sort-icon">{{ arrow('ticker') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='close'"          (click)="sortBy('close')">CLOSE (₹) <span class="sort-icon">{{ arrow('close') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='cci_20'"         (click)="sortBy('cci_20')">CCI (20) <span class="sort-icon">{{ arrow('cci_20') }}</span></th>
                      <th>TREND</th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='sma_20'"         (click)="sortBy('sma_20')">SMA (20) <span class="sort-icon">{{ arrow('sma_20') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='signal'"         (click)="sortBy('signal')">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B" style="margin-right:3px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>SIGNAL <span class="sort-icon">{{ arrow('signal') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='yearly_low_pct'" (click)="sortBy('yearly_low_pct')">1-YR LOW <span class="sort-icon">{{ arrow('yearly_low_pct') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='monthly_low_pct'"(click)="sortBy('monthly_low_pct')">1-MO LOW <span class="sort-icon">{{ arrow('monthly_low_pct') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='weekly_low_pct'" (click)="sortBy('weekly_low_pct')">1-WK LOW <span class="sort-icon">{{ arrow('weekly_low_pct') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='yearly_low_pct'" (click)="sortBy('yearly_low_pct')">DIST Y% <span class="sort-icon">{{ arrow('yearly_low_pct') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='monthly_low_pct'"(click)="sortBy('monthly_low_pct')">DIST M% <span class="sort-icon">{{ arrow('monthly_low_pct') }}</span></th>
                      <th class="th-sortable" [class.th-active]="sortCol()==='weekly_low_pct'" (click)="sortBy('weekly_low_pct')">DIST W% <span class="sort-icon">{{ arrow('weekly_low_pct') }}</span></th>
                      <th>TAGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of displayedResults(); track row.ticker; let i = $index) {
                      <tr [ngClass]="'row-sig-' + sigType(row)">
                        <td class="col-num text-secondary">{{ i + 1 }}</td>
                        <td class="col-ticker">
                          {{ row.ticker.replace('.NS','') }}
                          <a [href]="'https://www.tradingview.com/chart/?symbol=NSE:' + row.ticker.replace('.NS','')"
                             target="_blank" rel="noopener" class="tv-link" title="View on TradingView">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </a>
                        </td>
                        <td class="col-price tabular">{{ row.close | number:'1.2-2' }}</td>
                        <td class="tabular" [class.cci-pos]="row.cci_20 > 0" [class.cci-neg]="row.cci_20 < 0">
                          {{ row.cci_20 | number:'1.1-1' }}
                        </td>
                        <td><app-sparkline [values]="row.cci_history"></app-sparkline></td>
                        <td class="tabular">
                          <span [class.text-success]="row.close >= row.sma_20"
                                [class.text-danger]="row.close < row.sma_20">
                            {{ row.sma_20 | number:'1.2-2' }}
                            {{ row.close >= row.sma_20 ? '▲' : '▼' }}
                          </span>
                        </td>
                        <td><app-signal-badge [type]="sigType(row)"></app-signal-badge></td>
                        <td class="tabular">{{ (row.yearly_low  ?? lowPrice(row.close, row.yearly_low_pct))  | number:'1.2-2' }}</td>
                        <td class="tabular">{{ (row.monthly_low ?? lowPrice(row.close, row.monthly_low_pct)) | number:'1.2-2' }}</td>
                        <td class="tabular">{{ (row.weekly_low  ?? lowPrice(row.close, row.weekly_low_pct))  | number:'1.2-2' }}</td>
                        <td class="dist-col">
                          <div class="dist-cell">
                            <div class="dist-bar"><div class="dist-fill" [ngClass]="distCls(row.yearly_low_pct)"  [style.width]="distW(row.yearly_low_pct)"></div></div>
                            <span [ngClass]="distCls(row.yearly_low_pct)">{{ row.yearly_low_pct  | number:'1.1-1' }}%</span>
                          </div>
                        </td>
                        <td class="dist-col">
                          <div class="dist-cell">
                            <div class="dist-bar"><div class="dist-fill" [ngClass]="distCls(row.monthly_low_pct)" [style.width]="distW(row.monthly_low_pct)"></div></div>
                            <span [ngClass]="distCls(row.monthly_low_pct)">{{ row.monthly_low_pct | number:'1.1-1' }}%</span>
                          </div>
                        </td>
                        <td class="dist-col">
                          <div class="dist-cell">
                            <div class="dist-bar"><div class="dist-fill" [ngClass]="distCls(row.weekly_low_pct)"  [style.width]="distW(row.weekly_low_pct)"></div></div>
                            <span [ngClass]="distCls(row.weekly_low_pct)">{{ row.weekly_low_pct  | number:'1.1-1' }}%</span>
                          </div>
                        </td>
                        <td>
                          <div class="tags-cell">
                            @if (row.yearly_low_pct  <= YR_THR) { <span class="tag tag-yr">1-Yr</span> }
                            @if (row.monthly_low_pct <= MO_THR) { <span class="tag tag-mo">1-Mo</span> }
                            @if (row.weekly_low_pct  <= WK_THR) { <span class="tag tag-wk">1-Wk</span> }
                          </div>
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
    :host { display: contents; }

    .page-name { color: #EDE4D8; }

    /* Signal filter row */
    .sig-filter-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .sig-label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #F59E0B;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }
    .clear-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.12);
      color: #7a6a58;
      border-radius: 50%;
      width: 26px; height: 26px;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.18s;
      flex-shrink: 0;
    }
    .clear-btn:hover { background: rgba(255,255,255,0.08); color: #EDE4D8; }

    /* Stat cards */
    .stat-body {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
    }
    .stat-sub  { font-size: 0.7rem; color: #7a6a58; text-transform: uppercase; letter-spacing: 0.05em; }
    .thr       { font-size: 0.65rem; color: #5a4a38; margin-left: 2px; }
    .stat-num  { font-size: 1.6rem; font-weight: 700; color: #EDE4D8; line-height: 1; margin-top: 2px; }
    .yr-num    { color: #ef4444; }
    .mo-num    { color: #19BDFF; }
    .wk-num    { color: #10b981; }

    /* Active filter badge */
    .filter-badge-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .active-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0.28rem 0.75rem;
      border-radius: 50px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .active-badge.badge-yr { background: rgba(239,68,68,0.15);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
    .active-badge.badge-mo { background: rgba(25,189,255,0.12); color: #7dd3fc; border: 1px solid rgba(25,189,255,0.25); }
    .active-badge.badge-wk { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.25); }
    .rows-hint { font-size: 0.72rem; color: #5a4a38; margin-left: auto; }

    /* Table extras */
    .col-num   { color: #5a4a38; font-size: 0.75rem; width: 30px; text-align: right; padding-right: 0.5rem !important; }
    .tabular   { font-variant-numeric: tabular-nums; }

    /* DIST cell */
    .dist-col { min-width: 64px; }
    .dist-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
    }
    .dist-bar {
      height: 3px;
      background: rgba(255,255,255,0.08);
      border-radius: 2px;
      overflow: hidden;
    }
    .dist-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s ease;
    }
    .dist-danger  { color: #ef4444; }
    .dist-warning { color: #F59E0B; }
    .dist-safe    { color: #10b981; }
    .dist-fill.dist-danger  { background: #ef4444; }
    .dist-fill.dist-warning { background: #F59E0B; }
    .dist-fill.dist-safe    { background: #10b981; }

    /* TAGS */
    .tags-cell { display: flex; flex-wrap: wrap; gap: 3px; }
    .tag { font-size: 0.65rem; font-weight: 700; padding: 0.15em 0.5em; border-radius: 50px; }
    .tag-yr { background: rgba(239,68,68,0.18);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
    .tag-mo { background: rgba(25,189,255,0.15); color: #7dd3fc; border: 1px solid rgba(25,189,255,0.25); }
    .tag-wk { background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.25); }

    .col-ticker { display: flex; align-items: center; gap: 6px; font-weight: 600; white-space: nowrap; }
    .tv-link { color: #5a4a38; transition: color 0.18s; display: inline-flex; flex-shrink: 0; }
    .tv-link:hover { color: #F59E0B; }
  `]
})
export class WatchlistComponent {
  private readonly svc = inject(WatchlistService);

  name = input.required<string>();

  loading   = signal(true);
  results   = signal<SignalResult[]>([]);
  scannedAt = signal('');

  lowFilter = signal<LowFilter>('all');
  sigFilter = signal<SigFilter>('all');
  sortCol   = signal<SortCol>('yearly_low_pct');
  sortDir   = signal<SortDir>('asc');

  // Expose thresholds to template
  readonly YR_THR = YR_THR;
  readonly MO_THR = MO_THR;
  readonly WK_THR = WK_THR;

  constructor() {
    // Fix: react to name() changes so navigating between watchlists reloads data
    toObservable(this.name)
      .pipe(
        switchMap(n => {
          this.loading.set(true);
          this.results.set([]);
          this.scannedAt.set('');
          return this.svc.getResults(n);
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: res => {
          this.results.set(res.results ?? []);
          this.scannedAt.set(res.scanned_at ?? '');
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  toggleLow(f: 'yearly' | 'monthly' | 'weekly') {
    this.lowFilter.set(this.lowFilter() === f ? 'all' : f);
  }

  toggleSig(s: 'reversal' | 'recovery' | 'momentum' | 'overbought') {
    this.sigFilter.set(this.sigFilter() === s ? 'all' : s);
  }

  sortBy(col: SortCol) {
    if (this.sortCol() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

  arrow(col: SortCol): string {
    if (this.sortCol() !== col) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  sigType(row: SignalResult): string {
    const cci = row.cci_20;
    const abv = row.close >= row.sma_20;
    if (cci < -100 && !abv)              return 'reversal';
    if (cci >= -100 && cci <= 0 && abv)  return 'recovery';
    if (cci > 0 && cci <= 100 && abv)   return 'momentum';
    if (cci > 100 && abv)               return 'overbought';
    return 'neutral';
  }

  // Compute approximate actual low price from close + distance %
  lowPrice(close: number, pct: number): number {
    return close / (1 + pct / 100);
  }

  // DIST bar width: cap at 30% = 100% width
  distW(pct: number): string {
    return Math.min((pct / 30) * 100, 100).toFixed(1) + '%';
  }

  distCls(pct: number): string {
    if (pct <= 5)  return 'dist-danger';
    if (pct <= 15) return 'dist-warning';
    return 'dist-safe';
  }

  countYearly  = computed(() => this.results().filter(r => r.yearly_low_pct  <= YR_THR).length);
  countMonthly = computed(() => this.results().filter(r => r.monthly_low_pct <= MO_THR).length);
  countWeekly  = computed(() => this.results().filter(r => r.weekly_low_pct  <= WK_THR).length);

  displayedResults = computed(() => {
    let res = this.results();

    const lf = this.lowFilter();
    if      (lf === 'yearly')  res = res.filter(r => r.yearly_low_pct  <= YR_THR);
    else if (lf === 'monthly') res = res.filter(r => r.monthly_low_pct <= MO_THR);
    else if (lf === 'weekly')  res = res.filter(r => r.weekly_low_pct  <= WK_THR);

    const sf = this.sigFilter();
    if (sf !== 'all') res = res.filter(r => this.sigType(r) === sf);

    const col = this.sortCol();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    return [...res].sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (col) {
        case 'ticker':          va = a.ticker;                          vb = b.ticker;                          break;
        case 'signal':          va = SIG_ORDER[this.sigType(a)] ?? 9;  vb = SIG_ORDER[this.sigType(b)] ?? 9;  break;
        case 'close':           va = a.close;                           vb = b.close;                           break;
        case 'cci_20':          va = a.cci_20;                          vb = b.cci_20;                          break;
        case 'sma_20':          va = a.sma_20;                          vb = b.sma_20;                          break;
        case 'yearly_low_pct':  va = a.yearly_low_pct;                  vb = b.yearly_low_pct;                  break;
        case 'monthly_low_pct': va = a.monthly_low_pct;                 vb = b.monthly_low_pct;                 break;
        case 'weekly_low_pct':  va = a.weekly_low_pct;                  vb = b.weekly_low_pct;                  break;
        default:                va = 0;                                 vb = 0;
      }
      if (va < vb) return -dir;
      if (va > vb) return  dir;
      return 0;
    });
  });
}
