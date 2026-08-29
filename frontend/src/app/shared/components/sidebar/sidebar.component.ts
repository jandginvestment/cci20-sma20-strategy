import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WatchlistService, WatchlistMeta } from '../../../core/api/watchlist.service';
import { AuthService } from '../../../core/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { DisclaimerDialogComponent } from '../disclaimer-dialog/disclaimer-dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">

      <!-- Logo + toggle -->
      <div class="sidebar-header">
        <div class="logo-box" [class.d-none]="collapsed()">
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <path d="M4 20 L12 20 L16 8 L20 32 L24 14 L28 22 L36 22"
                  stroke="white" stroke-width="3.2" fill="none"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="brand-name" [class.d-none]="collapsed()">CCI/SMA</span>
        <button class="toggle-btn ms-auto" (click)="toggle()" title="Toggle sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6"  x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">

        <!-- Dashboard -->
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" title="Dashboard">
          <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span class="nav-label">Dashboard</span>
        </a>

        <!-- Watchlists section -->
        <div class="section-title" [class.d-none]="collapsed()">WATCHLISTS</div>

        @for (wl of watchlists(); track wl.id) {
          <a [routerLink]="['/watchlist', wl.name]" routerLinkActive="active"
             class="nav-item" [title]="wl.name">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span class="nav-label">{{ wl.name }}</span>
          </a>
        }

        <div class="nav-spacer"></div>
        
        <!-- Admin Panel -->
        @if (authService.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="active" class="nav-item" title="Admin Panel">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span class="nav-label">Admin Panel</span>
          </a>
        }

        <!-- Settings -->
        <a routerLink="/settings" routerLinkActive="active" class="nav-item" title="Settings">
          <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                     a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                     A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                     l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                     A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                     l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                     a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                     l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                     a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span class="nav-label">Settings</span>
        </a>

        <!-- Disclaimer -->
        <a (click)="openDisclaimer()" style="cursor:pointer" class="nav-item" title="Disclaimer">
          <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span class="nav-label">Disclaimer</span>
        </a>

        <!-- Help -->
        <a href="https://github.com/jandginvestment/cci20-sma20-strategy" target="_blank"
           class="nav-item" title="Help">
          <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span class="nav-label">Help</span>
        </a>

        <!-- Logout -->
        <a class="nav-item nav-item-danger" (click)="logout()" style="cursor:pointer" title="Logout">
          <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span class="nav-label">Logout</span>
        </a>

      </nav>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .sidebar {
      width: 240px;
      min-width: 240px;
      height: 100vh;
      background: #120f0a;
      border-right: 1px solid rgba(245,158,11,0.12);
      display: flex;
      flex-direction: column;
      transition: width 0.28s cubic-bezier(0.4,0,0.2,1),
                  min-width 0.28s cubic-bezier(0.4,0,0.2,1);
      overflow-x: hidden;
      overflow-y: auto;
    }
    .sidebar.collapsed { width: 64px; min-width: 64px; }

    /* Header */
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      height: 64px;
      padding: 0 1rem;
      border-bottom: 1px solid rgba(245,158,11,0.12);
      flex-shrink: 0;
    }
    .logo-box {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #F59E0B, #D97706);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(245,158,11,0.4);
    }
    .brand-name {
      font-weight: 700;
      font-size: 1rem;
      color: #EDE4D8;
      white-space: nowrap;
    }
    .toggle-btn {
      background: transparent;
      border: none;
      color: #817569;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border-radius: 6px;
      flex-shrink: 0;
      transition: background 0.18s, color 0.18s;
    }
    .toggle-btn:hover { background: rgba(245,158,11,0.1); color: #EDE4D8; }

    /* Nav */
    .sidebar-nav {
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .section-title {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #6b5d50;
      padding: 0.75rem 0.75rem 0.25rem;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      color: #B7C8E1;
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.18s, color 0.18s;
      white-space: nowrap;
      overflow: hidden;
    }
    .nav-item:hover {
      background: rgba(245,158,11,0.1);
      color: #F59E0B;
    }
    .nav-item.active {
      background: rgba(245,158,11,0.15);
      color: #F59E0B;
      border: 1px solid rgba(245,158,11,0.3);
    }
    .nav-icon { flex-shrink: 0; }

    .nav-label { transition: opacity 0.2s; }
    .sidebar.collapsed .nav-label { opacity: 0; width: 0; overflow: hidden; }
    .sidebar.collapsed .nav-item { justify-content: center; padding: 0.65rem 0; }
    .sidebar.collapsed .section-title { opacity: 0; }

    .nav-spacer { flex: 1; min-height: 1rem; }
  `]
})
export class SidebarComponent implements OnInit {
  private readonly watchlistService = inject(WatchlistService);
  public readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  collapsed = signal(false);
  watchlists = signal<WatchlistMeta[]>([]);

  ngOnInit() {
    this.watchlistService.getWatchlists().subscribe(list => {
      this.watchlists.set(list);
    });
  }

  toggle() {
    this.collapsed.set(!this.collapsed());
  }

  openDisclaimer() {
    this.dialog.open(DisclaimerDialogComponent, {
      width: '500px',
      panelClass: 'disclaimer-panel'
    });
  }

  logout() {
    this.authService.logout();
  }
}
