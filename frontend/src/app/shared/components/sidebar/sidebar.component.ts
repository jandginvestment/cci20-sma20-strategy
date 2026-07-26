import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { WatchlistService, WatchlistMeta } from '../../../core/api/watchlist.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-header">
        <button class="toggle-btn" (click)="toggle()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="sidebar-nav">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span class="nav-label">Dashboard</span>
        </a>

        <div class="nav-section">
          <div class="section-title">WATCHLISTS</div>
          @for (wl of watchlists(); track wl.id) {
            <a [routerLink]="['/watchlist', wl.name]" routerLinkActive="active" class="nav-item">
              <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span class="nav-label">{{ wl.name }}</span>
            </a>
          }
        </div>

        <div class="nav-spacer"></div>

        <a routerLink="/settings" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span class="nav-label">Settings</span>
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 260px;
      background: var(--bg-card);
      border-right: 1px solid var(--border-glow);
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      overflow-x: hidden;
      white-space: nowrap;
    }
    .sidebar.collapsed {
      width: 72px;
    }
    .sidebar-header {
      height: 64px;
      display: flex;
      align-items: center;
      padding: 0 1.5rem;
      border-bottom: 1px solid var(--border-glow);
    }
    .toggle-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-left: -4px;
      border-radius: 6px;
    }
    .toggle-btn:hover {
      background: rgba(255,255,255,0.05);
      color: var(--text-primary);
    }
    .sidebar.collapsed .sidebar-header {
      padding: 0;
      justify-content: center;
    }
    .sidebar.collapsed .toggle-btn {
      margin-left: 0;
    }
    .sidebar-nav {
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
      overflow-y: auto;
    }
    .nav-section {
      margin-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      padding: 0 1rem;
      margin-bottom: 0.5rem;
      opacity: 1;
      transition: opacity 0.2s;
    }
    .sidebar.collapsed .section-title {
      opacity: 0;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      color: var(--text-secondary);
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      background: rgba(59, 130, 246, 0.1);
      color: var(--accent);
    }
    .nav-item.active {
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .nav-icon {
      flex-shrink: 0;
    }
    .nav-label {
      font-weight: 500;
      opacity: 1;
      transition: opacity 0.2s;
    }
    .sidebar.collapsed .nav-label {
      opacity: 0;
      display: none;
    }
    .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 0.75rem 0;
    }
    .nav-spacer {
      flex: 1;
    }
  `]
})
export class SidebarComponent implements OnInit {
  private watchlistService = inject(WatchlistService);
  
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
}
