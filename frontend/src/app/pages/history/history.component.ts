import { Component, input, OnInit, inject, signal } from '@angular/core';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { WatchlistService, HistoryRun, SignalResult } from '../../core/api/watchlist.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, DatePipe],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="page-container">
          <div class="header-row">
            <h1>History: {{ name() }}</h1>
          </div>

          <div class="timeline-container">
            @for (run of history(); track run.id) {
              <div class="timeline-item card" (click)="loadRun(run.id)" [class.active]="selectedRunId() === run.id">
                <div class="run-date">{{ run.scanned_at | date:'medium' }}</div>
                <div class="run-stats">{{ run.ticker_count }} tickers</div>
              </div>
            }
          </div>

          @if (selectedRunId()) {
            <h2 class="mt-4">Run Results</h2>
            <div class="card table-card">
              @if (loadingRun()) {
                <div class="skeleton-table">
                  <div class="skeleton-row skeleton"></div>
                  <div class="skeleton-row skeleton"></div>
                </div>
              } @else {
                <div class="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Close</th>
                        <th>CCI(20)</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of runResults(); track row.ticker) {
                        <tr>
                          <td>{{ row.ticker }}</td>
                          <td>{{ row.close }}</td>
                          <td>{{ row.cci_20 }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    .header-row { margin-bottom: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    h2 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 1rem; }
    .timeline-container { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; }
    .timeline-item { 
      min-width: 200px; cursor: pointer; border: 1px solid var(--border-glow); 
    }
    .timeline-item:hover { border-color: var(--accent); }
    .timeline-item.active { border-color: var(--accent); background: rgba(59, 130, 246, 0.1); }
    .run-date { font-weight: 500; margin-bottom: 0.5rem; }
    .run-stats { font-size: 0.875rem; color: var(--text-secondary); }
    
    .table-card { padding: 0; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-glow); }
    th { background: rgba(0,0,0,0.2); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; }
    .skeleton-table { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-row { height: 40px; border-radius: 4px; }
  `]
})
export class HistoryComponent implements OnInit {
  private watchlistService = inject(WatchlistService);
  
  name = input.required<string>();
  
  history = signal<HistoryRun[]>([]);
  selectedRunId = signal<string | null>(null);
  runResults = signal<SignalResult[]>([]);
  loadingRun = signal(false);

  ngOnInit() {
    this.watchlistService.getHistory(this.name()).subscribe(res => {
      this.history.set(res);
    });
  }

  loadRun(id: string) {
    this.selectedRunId.set(id);
    this.loadingRun.set(true);
    this.watchlistService.getHistoricalResults(this.name(), id).subscribe({
      next: (res) => {
        this.runResults.set(res.results);
        this.loadingRun.set(false);
      },
      error: () => this.loadingRun.set(false)
    });
  }
}
