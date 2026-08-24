import { Component, input, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SignalBadgeComponent } from '../../shared/components/signal-badge/signal-badge.component';
import { SparklineComponent } from '../../shared/components/sparkline/sparkline.component';
import { WatchlistService, SignalResult } from '../../core/api/watchlist.service';
import { RouterModule } from '@angular/router';
import { DecimalPipe } from '@angular/common';

type LowFilter  = 'all' | 'yearly' | 'monthly' | 'weekly';
type SigFilter  = 'all' | 'reversal' | 'recovery' | 'momentum' | 'overbought';
type SortCol    = 'ticker' | 'signal' | 'close' | 'cci_20' | 'sma_pos' | 'yearly_low_pct' | 'monthly_low_pct' | 'weekly_low_pct';
type SortDir    = 'asc' | 'desc';

const SIG_ORDER: Record<string, number> = { reversal: 0, recovery: 1, momentum: 2, overbought: 3, neutral: 4 };

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, SignalBadgeComponent, SparklineComponent, RouterModule, DecimalPipe, NgClass],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="page-container">

          <!-- Header -->
          <div class="d-flex align-items-flex-start justify-content-between mb-4">
            <div>
              <h4 class="mb-1 fw-bold">{{ name() }}</h4>
              <small class="text-secondary">
                Scanned: {{ scannedAt() || 'Never' }}
                @if (!loading()) {
                  &nbsp;·&nbsp;{{ displayedResults().length }} / {{ results().length }} results
                }
              </small>
            </div>
            <a [routerLink]="['/history', name()]" class="btn-ghost mt-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              History
            </a>
          </div>

          <!-- Stat cards -->
          <div class="row g-3 mb-4">
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card"
                   [class.stat-active-yr]="lowFilter() === 'yearly'"
                   (click)="toggleLow('yearly')">
                <div class="card-body d-flex align-items-center gap-3 py-3">
                  <div class="stat-icon highlight">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                      <polyline points="17 18 23 18 23 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-num">{{ countYearly() }}</div>
                    <div class="stat-lbl">Near Yearly Low</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card"
                   [class.stat-active-mo]="lowFilter() === 'monthly'"
                   (click)="toggleLow('monthly')">
                <div class="card-body d-flex align-items-center gap-3 py-3">
                  <div class="stat-icon neutral">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-num">{{ countMonthly() }}</div>
                    <div class="stat-lbl">Near Monthly Low</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card"
                   [class.stat-active-wk]="lowFilter() === 'weekly'"
                   (click)="toggleLow('weekly')">
                <div class="card-body d-flex align-items-center gap-3 py-3">
                  <div class="stat-icon default">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-num">{{ countWeekly() }}</div>
                    <div class="stat-lbl">Near Weekly Low</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="card card-glass stat-card" (click)="lowFilter.set('all')">
                <div class="card-body d-flex align-items-center gap-3 py-3">
                  <div class="stat-icon trend-up">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </div>
                  <div>
                    <div class="stat-num">{{ results().length }}</div>
                    <div class="stat-lbl">Total Results</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Signal filter chips -->
          <div class="d-flex flex-wrap gap-2 mb-4">
            <button class="sig-chip" [class.active]="sigFilter() === 'all'" (click)="sigFilter.set('all')">
              All Signals
            </button>
            <button class="sig-chip sig-reversal" [class.active]="sigFilter() === 'reversal'" (click)="sigFilter.set('reversal')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                <polyline points="17 18 23 18 23 12"></polyline>
              </svg>
              Reversal Zone
            </button>
            <button class="sig-chip sig-recovery" [class.active]="sigFilter() === 'recovery'" (click)="sigFilter.set('recovery')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              Recovery
            </button>
            <button class="sig-chip sig-momentum" [class.active]="sigFilter() === 'momentum'" (click)="sigFilter.set('momentum')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              Bullish Setup
            </button>
            <button class="sig-chip sig-overbought" [class.active]="sigFilter() === 'overbought'" (click)="sigFilter.set('overbought')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Overbought
            </button>
          </div>

          <!-- Results table -->
          <div class="card card-glass p-0 overflow-hidden">
            @if (loading()) {
              <div class="p-4">
                @for (i of [1,2,3,4,5,6,7]; track i) {
                  <div class="skeleton mb-3" style="height:38px; border-radius:6px;"></div>
                }
              </div>
            } @else if (displayedResults().length === 0) {
              <div class="p-5 text-center">
                <div style="font-size:2rem; margin-bottom:.75rem;">📭</div>
                <p class="text-secondary mb-0">No results for the selected filters.</p>
              </div>
            } @else {
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0 scanner-table">
                  <thead>
                    <tr>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'ticker'" (click)="sortBy('ticker')">
                        Ticker <span class="sort-icon">{{ arrow('ticker') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'signal'" (click)="sortBy('signal')">
                        Signal <span class="sort-icon">{{ arrow('signal') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'close'" (click)="sortBy('close')">
                        Close <span class="sort-icon">{{ arrow('close') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'cci_20'" (click)="sortBy('cci_20')">
                        CCI(20) <span class="sort-icon">{{ arrow('cci_20') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'sma_pos'" (click)="sortBy('sma_pos')">
                        vs SMA <span class="sort-icon">{{ arrow('sma_pos') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'yearly_low_pct'" (click)="sortBy('yearly_low_pct')">
                        Yearly Low% <span class="sort-icon">{{ arrow('yearly_low_pct') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'monthly_low_pct'" (click)="sortBy('monthly_low_pct')">
                        Monthly Low% <span class="sort-icon">{{ arrow('monthly_low_pct') }}</span>
                      </th>
                      <th class="th-sortable" [class.th-active]="sortCol() === 'weekly_low_pct'" (click)="sortBy('weekly_low_pct')">
                        Weekly Low% <span class="sort-icon">{{ arrow('weekly_low_pct') }}</span>
                      </th>
                      <th>CCI History</th>
                      <th>TV</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of displayedResults(); track row.ticker) {
                      <tr [ngClass]="'row-sig-' + sigType(row)">
                        <td class="col-ticker">{{ row.ticker.replace('.NS','') }}</td>
                        <td><app-signal-badge [type]="sigType(row)"></app-signal-badge></td>
                        <td class="col-price">{{ row.close | number:'1.2-2' }}</td>
                        <td [class.cci-pos]="row.cci_20 > 0" [class.cci-neg]="row.cci_20 < 0">
                          {{ row.cci_20 | number:'1.1-1' }}
                        </td>
                        <td>
                          @if (row.close >= row.sma_20) {
                            <span class="text-success fw-medium">Above</span>
                          } @else {
                            <span class="text-danger fw-medium">Below</span>
                          }
                        </td>
                        <td>
                          <span class="badge badge-yr">{{ row.yearly_low_pct | number:'1.1-1' }}%</span>
                        </td>
                        <td>
                          <span class="badge badge-mo">{{ row.monthly_low_pct | number:'1.1-1' }}%</span>
                        </td>
                        <td>
                          <span class="badge badge-wk">{{ row.weekly_low_pct | number:'1.1-1' }}%</span>
                        </td>
                        <td>
                          <app-sparkline [values]="row.cci_history"></app-sparkline>
                        </td>
                        <td>
                          <a [href]="'https://in.tradingview.com/chart/?symbol=NSE:' + row.ticker.replace('.NS', '')"
                             target="_blank" class="tv-link" title="Open in TradingView">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
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
    :host { display: contents; }
    .tv-link { color: #475569; transition: color 0.18s; display: inline-flex; }
    .tv-link:hover { color: #a5b4fc; }
  `]
})
export class WatchlistComponent implements OnInit {
  private svc = inject(WatchlistService);

  name = input.required<string>();

  loading   = signal(true);
  results   = signal<SignalResult[]>([]);
  scannedAt = signal('');

  lowFilter = signal<LowFilter>('all');
  sigFilter = signal<SigFilter>('all');
  sortCol   = signal<SortCol>('yearly_low_pct');
  sortDir   = signal<SortDir>('asc');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getResults(this.name()).subscribe({
      next: res => {
        this.results.set(res.results ?? []);
        this.scannedAt.set(res.scanned_at);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleLow(f: 'yearly' | 'monthly' | 'weekly') {
    this.lowFilter.set(this.lowFilter() === f ? 'all' : f);
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
    const cci  = row.cci_20;
    const abv  = row.close >= row.sma_20;
    if (cci < -100 && !abv)                   return 'reversal';
    if (cci >= -100 && cci <= 0 && abv)       return 'recovery';
    if (cci > 0    && cci <= 100 && abv)      return 'momentum';
    if (cci > 100  && abv)                    return 'overbought';
    return 'neutral';
  }

  countYearly  = computed(() => this.results().filter(r => r.yearly_low_pct  <= 10).length);
  countMonthly = computed(() => this.results().filter(r => r.monthly_low_pct <= 5).length);
  countWeekly  = computed(() => this.results().filter(r => r.weekly_low_pct  <= 2).length);

  displayedResults = computed(() => {
    let res = this.results();

    const lf = this.lowFilter();
    if (lf === 'yearly')  res = res.filter(r => r.yearly_low_pct  <= 10);
    else if (lf === 'monthly') res = res.filter(r => r.monthly_low_pct <= 5);
    else if (lf === 'weekly')  res = res.filter(r => r.weekly_low_pct  <= 2);

    const sf = this.sigFilter();
    if (sf !== 'all') res = res.filter(r => this.sigType(r) === sf);

    const col = this.sortCol();
    const dir = this.sortDir() === 'asc' ? 1 : -1;

    return [...res].sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      switch (col) {
        case 'ticker':         va = a.ticker;                                   vb = b.ticker;                                   break;
        case 'signal':         va = SIG_ORDER[this.sigType(a)] ?? 9;           vb = SIG_ORDER[this.sigType(b)] ?? 9;           break;
        case 'close':          va = a.close;                                    vb = b.close;                                    break;
        case 'cci_20':         va = a.cci_20;                                   vb = b.cci_20;                                   break;
        case 'sma_pos':        va = a.close >= a.sma_20 ? 1 : 0;              vb = b.close >= b.sma_20 ? 1 : 0;              break;
        case 'yearly_low_pct': va = a.yearly_low_pct;                          vb = b.yearly_low_pct;                          break;
        case 'monthly_low_pct':va = a.monthly_low_pct;                         vb = b.monthly_low_pct;                         break;
        case 'weekly_low_pct': va = a.weekly_low_pct;                          vb = b.weekly_low_pct;                          break;
        default:               va = 0;                                          vb = 0;
      }
      if (va < vb) return -dir;
      if (va > vb) return  dir;
      return 0;
    });
  });
}
