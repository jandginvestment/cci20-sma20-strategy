import { Component, inject, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { WatchlistService, WatchlistMeta } from '../../core/api/watchlist.service';
import { AuthService } from '../../core/auth/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [SidebarComponent, NavbarComponent, DatePipe],
  template: `
    <div class="layout-container">
      <app-sidebar></app-sidebar>
      <div class="layout-content">
        <app-navbar></app-navbar>
        <main class="page-container">
          <div class="header-row">
            <h1>Settings</h1>
          </div>

          <div class="settings-grid">
            <div class="card profile-card">
              <h2>User Profile</h2>
              <div class="profile-info">
                <div class="info-group">
                  <label>Email Address</label>
                  <p>{{ authService.userEmail() }}</p>
                </div>
              </div>
            </div>

            <div class="card wl-manage-card">
              <h2>Manage Watchlists</h2>
              
              <div class="wl-list">
                @for (wl of watchlists(); track wl.id) {
                  <div class="wl-item">
                    <div>
                      <strong>{{ wl.name }}</strong>
                      <span class="date">Added {{ wl.created_at | date:'shortDate' }}</span>
                    </div>
                    <button class="btn-ghost text-danger" (click)="confirmDelete(wl.name)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                }
              </div>

              <div class="add-wl-form mt-4">
                <h3>Add New Watchlist</h3>
                <div class="form-group">
                  <input type="text" #nameInput placeholder="Watchlist Name (e.g. NIFTY500)" class="input-field">
                  <input type="file" #fileInput accept=".csv" class="file-input">
                  <button class="btn-primary" (click)="addWatchlist(nameInput.value, fileInput.files)">Upload</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    @if (deletingWl()) {
      <div class="modal-overlay">
        <div class="card modal-card">
          <h3>Delete Watchlist?</h3>
          <p>Are you sure you want to delete <strong>{{ deletingWl() }}</strong>?</p>
          <div class="modal-actions">
            <button class="btn-ghost" (click)="deletingWl.set(null)">Cancel</button>
            <button class="btn-primary danger" (click)="deleteWatchlist()">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .header-row { margin-bottom: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 600; }
    h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1.5rem; }
    h3 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
    
    .settings-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 1.5rem; align-items: start; }
    
    .info-group label { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; text-transform: uppercase; }
    .info-group p { font-size: 1rem; }
    
    .wl-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid var(--border-glow); border-radius: 8px; margin-bottom: 0.5rem; }
    .wl-item strong { display: block; font-size: 1rem; }
    .date { font-size: 0.75rem; color: var(--text-secondary); }
    .text-danger { color: var(--danger); }
    .text-danger:hover { background: rgba(239, 68, 68, 0.1); }
    
    .mt-4 { margin-top: 2rem; }
    .form-group { display: flex; gap: 1rem; }
    .input-field, .file-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-glow); color: var(--text-primary); padding: 0.75rem; border-radius: 8px; font-family: inherit; }
    .input-field { flex: 1; }
    
    .modal-card { width: 400px; padding: 2rem; text-align: center; }
    .modal-card p { margin: 1rem 0 2rem; color: var(--text-secondary); }
    .modal-actions { display: flex; justify-content: center; gap: 1rem; }
    .btn-primary.danger { background: var(--danger); }
    .btn-primary.danger:hover { background: #dc2626; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
  `]
})
export class SettingsComponent implements OnInit {
  authService = inject(AuthService);
  private watchlistService = inject(WatchlistService);
  
  watchlists = signal<WatchlistMeta[]>([]);
  deletingWl = signal<string | null>(null);

  ngOnInit() {
    this.loadWatchlists();
  }

  loadWatchlists() {
    this.watchlistService.getWatchlists().subscribe(list => this.watchlists.set(list));
  }

  addWatchlist(name: string, files: FileList | null) {
    if (!name || !files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      // Parse CSV: split by comma/newline, clean up spaces, and remove empty elements
      const tickers = text.split(/[\r\n,]+/)
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0);
        
      if (tickers.length === 0) return;
      
      this.watchlistService.createWatchlist(name, tickers).subscribe(() => {
        this.loadWatchlists();
      });
    };
    reader.readAsText(file);
  }

  confirmDelete(name: string) {
    this.deletingWl.set(name);
  }

  deleteWatchlist() {
    const name = this.deletingWl();
    if (!name) return;
    this.watchlistService.deleteWatchlist(name).subscribe(() => {
      this.deletingWl.set(null);
      this.loadWatchlists();
    });
  }
}
