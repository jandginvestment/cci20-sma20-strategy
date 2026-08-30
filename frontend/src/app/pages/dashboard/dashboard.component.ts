import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { WatchlistService, WatchlistMeta } from '../../core/api/watchlist.service';
import { ScanService } from '../../core/api/scan.service';
import { TourService } from '../../core/tour.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, SidebarComponent, NavbarComponent, DatePipe],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="page-container">
          <div class="header-row">
            <h1>Dashboard</h1>
            <button class="btn btn-primary" (click)="triggerScan()" [disabled]="scanning()">
              @if (scanning()) {
                <div class="spinner"></div> Scanning...
              } @else {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Trigger Scan
              }
            </button>
          </div>

          <div class="hero-stats">
            <div class="card stat-card">
              <div class="stat-label">Total Tickers</div>
              <div class="stat-value">{{ totalTickers() }}</div>
            </div>
            <div class="card stat-card">
              <div class="stat-label">Near Yearly Low</div>
              <div class="stat-value text-success">{{ yearlyLow() }}</div>
            </div>
            <div class="card stat-card">
              <div class="stat-label">Near Monthly Low</div>
              <div class="stat-value text-warning">{{ monthlyLow() }}</div>
            </div>
            <div class="card stat-card">
              <div class="stat-label">Near Weekly Low</div>
              <div class="stat-value text-primary">{{ weeklyLow() }}</div>
            </div>
          </div>

          <h2>Your Watchlists</h2>
          <div class="watchlist-grid">
            @for (wl of watchlists(); track wl.id) {
              <div class="card wl-card" [routerLink]="['/watchlist', wl.name]">
                <div class="wl-header">
                  <h3>{{ wl.name }}</h3>
                  <span class="date">{{ wl.created_at | date:'shortDate' }}</span>
                </div>
                <div class="wl-body">
                  <div class="wl-stat">
                    <span>Tickers</span>
                    <strong>--</strong>
                  </div>
                  <div class="wl-stat">
                    <span>Last Scan</span>
                    <strong>--</strong>
                  </div>
                </div>
              </div>
            }
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
    }
    .hero-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }
    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.5rem;
    }
    .stat-label {
      font-size: 0.875rem;
      color: var(--bs-secondary-color);
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
    }
    .watchlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .wl-card {
      cursor: pointer;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    .wl-card:hover {
      border-color: var(--bs-primary);
      transform: translateY(-2px);
    }
    .wl-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .wl-header h3 {
      font-size: 1.125rem;
      font-weight: 600;
    }
    .date {
      font-size: 0.75rem;
      color: var(--bs-secondary-color);
    }
    .wl-body {
      display: flex;
      gap: 1.5rem;
    }
    .wl-stat {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .wl-stat span {
      font-size: 0.75rem;
      color: var(--bs-secondary-color);
    }
    .wl-stat strong {
      font-size: 1rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private watchlistService = inject(WatchlistService);
  private scanService = inject(ScanService);
  private tourService = inject(TourService);

  watchlists = signal<WatchlistMeta[]>([]);
  scanning = signal(false);
  
  totalTickers = signal(0);
  yearlyLow = signal(0);
  monthlyLow = signal(0);
  weeklyLow = signal(0);

  ngOnInit() {
    this.watchlistService.getWatchlists().subscribe(list => {
      this.watchlists.set(list);
    });
    this.checkStatus();
    // Auto-start guided tour for first-time users
    setTimeout(() => this.tourService.start(), 800);
  }

  triggerScan() {
    this.scanning.set(true);
    this.scanService.triggerScan().subscribe({
      next: () => {
        // Start polling or just wait
        setTimeout(() => this.checkStatus(), 5000);
      },
      error: () => this.scanning.set(false)
    });
  }

  private checkStatus() {
    this.scanService.getScanStatus().subscribe({
      next: (status) => {
        this.scanning.set(status.scan_in_progress);
        this.totalTickers.set(status.ticker_count);
      }
    });
  }
}
