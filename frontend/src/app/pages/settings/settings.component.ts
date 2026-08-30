import { Component, inject, signal, OnInit } from '@angular/core';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { WatchlistService, WatchlistMeta } from '../../core/api/watchlist.service';
import { AuthService } from '../../core/auth/auth.service';
import { TourService } from '../../core/tour.service';
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

          <h1 class="page-title">Settings</h1>

          <!-- Cards row -->
          <div class="settings-grid">

            <!-- User Profile -->
            <div class="card card-glass s-card">
              <div class="s-card-title">User Profile</div>
              <div class="info-group">
                <div class="info-label">Email Address</div>
                <div class="info-value">{{ authService.userEmail() }}</div>
              </div>
            </div>

            <!-- Manage Watchlists -->
            <div class="card card-glass s-card">
              <div class="s-card-title">Manage Watchlists</div>

              <!-- Existing list -->
              @if (watchlists().length > 0) {
                <div class="wl-list">
                  @for (wl of watchlists(); track wl.id) {
                    <div class="wl-row">
                      <span class="wl-name">{{ wl.name }}</span>
                      <span class="wl-date">{{ wl.created_at | date:'dd MMM yyyy' }}</span>
                      <button class="wl-del" (click)="confirmDelete(wl.name)" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
                <div class="divider"></div>
              }

              <!-- Add new -->
              <div class="add-section-title">Add New Watchlist</div>
              <div class="upload-row">
                <input #nameInput type="text" class="wl-input" placeholder="Watchlist name…">
                <label class="file-btn">
                  Choose File
                  <input #fileInput type="file" accept=".csv" style="display:none"
                         (change)="onFileChange(fileInput)">
                </label>
                <span class="file-name">{{ fileName() }}</span>
                <button class="upload-btn" (click)="addWatchlist(nameInput, fileInput)">Upload</button>
              </div>
            </div>

          </div>

          <!-- Console log -->
          <div class="console-box">
            @for (line of logs(); track $index) {
              <div class="console-line">
                <span class="console-prompt">▶</span> {{ line }}
              </div>
            }
          </div>

        </main>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    @if (deletingWl()) {
      <div class="modal-overlay" (click)="deletingWl.set(null)">
        <div class="card card-glass modal-card" (click)="$event.stopPropagation()">
          <div class="s-card-title">Delete Watchlist?</div>
          <p class="modal-msg">
            Remove <strong class="amber">{{ deletingWl() }}</strong> and all its data?
          </p>
          <div class="modal-actions">
            <button class="btn-ghost" (click)="deletingWl.set(null)">Cancel</button>
            <button class="del-confirm-btn" (click)="deleteWatchlist()">Delete</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }

    .page-title {
      font-size: 2rem;
      font-weight: 700;
      color: #EDE4D8;
      margin-bottom: 1.75rem;
    }

    /* Two-column grid */
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1.25rem;
      align-items: start;
      margin-bottom: 1.25rem;
    }

    /* Card base */
    .s-card { padding: 1.5rem; }
    .s-card-title {
      font-size: 1rem;
      font-weight: 600;
      color: #EDE4D8;
      margin-bottom: 1.25rem;
      letter-spacing: 0.02em;
    }

    /* Profile info */
    .info-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #F59E0B;
      margin-bottom: 0.35rem;
    }
    .info-value {
      font-size: 0.9rem;
      color: #F59E0B;
    }

    /* Existing watchlist rows */
    .wl-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .wl-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      background: rgba(245,158,11,0.05);
      border: 1px solid rgba(245,158,11,0.12);
      border-radius: 8px;
    }
    .wl-name { flex: 1; font-size: 0.875rem; font-weight: 600; color: #EDE4D8; }
    .wl-date { font-size: 0.75rem; color: #6b5d50; }
    .wl-del {
      background: transparent;
      border: none;
      color: #6b5d50;
      cursor: pointer;
      display: flex;
      padding: 4px;
      border-radius: 5px;
      transition: color 0.18s, background 0.18s;
    }
    .wl-del:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    .divider {
      height: 1px;
      background: rgba(245,158,11,0.1);
      margin-bottom: 1.25rem;
    }

    /* Add form */
    .add-section-title {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #6b5d50;
      margin-bottom: 0.75rem;
    }
    .upload-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .wl-input {
      flex: 1;
      min-width: 120px;
      background: rgba(0,0,0,0.25);
      border: 1px solid rgba(245,158,11,0.2);
      color: #EDE4D8;
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.18s;
    }
    .wl-input:focus { border-color: rgba(245,158,11,0.5); }
    .wl-input::placeholder { color: #6b5d50; }

    .file-btn {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 0.9rem;
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.25);
      color: #D4C8B8;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.18s, border-color 0.18s;
    }
    .file-btn:hover { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); }

    .file-name {
      font-size: 0.78rem;
      color: #6b5d50;
      white-space: nowrap;
      flex: 1;
    }

    .upload-btn {
      padding: 0.5rem 1.25rem;
      background: #F59E0B;
      color: #1c1710;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.18s, transform 0.12s;
    }
    .upload-btn:hover { background: #D97706; transform: translateY(-1px); }
    .upload-btn:active { transform: translateY(0); }

    /* Console */
    .console-box {
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(245,158,11,0.12);
      border-radius: 10px;
      padding: 0.85rem 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      min-height: 52px;
    }
    .console-line { display: flex; gap: 0.6rem; line-height: 1.7; color: #B7C8E1; }
    .console-prompt { color: #F59E0B; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 500;
    }
    .modal-card { padding: 2rem; width: 380px; text-align: center; }
    .modal-msg { margin: 1rem 0 1.75rem; color: #D4C8B8; font-size: 0.9rem; }
    .amber { color: #F59E0B; }
    .modal-actions { display: flex; justify-content: center; gap: 0.75rem; }
    .del-confirm-btn {
      padding: 0.5rem 1.25rem;
      background: #ef4444;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s;
    }
    .del-confirm-btn:hover { background: #dc2626; }
  `]
})
export class SettingsComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly tourService = inject(TourService);

  watchlists = signal<WatchlistMeta[]>([]);
  deletingWl = signal<string | null>(null);
  fileName   = signal('No file chosen');
  logs       = signal<string[]>(['System settings loaded successfully. Watchlist manager initialized.']);

  ngOnInit() {
    this.loadWatchlists();
    // Resume guided tour phase 3 (upload step) when landing on settings
    if (this.tourService.step() === 6 && !this.tourService.active() && !localStorage.getItem('cci_tour_done')) {
      setTimeout(() => this.tourService.resume(), 500);
    }
  }

  loadWatchlists() {
    this.watchlistService.getWatchlists().subscribe(list => this.watchlists.set(list));
  }

  onFileChange(input: HTMLInputElement) {
    this.fileName.set(input.files?.[0]?.name ?? 'No file chosen');
  }

  addWatchlist(nameEl: HTMLInputElement, fileEl: HTMLInputElement) {
    const name  = nameEl.value.trim();
    const files = fileEl.files;
    if (!name)           { this.log('Enter a watchlist name.'); return; }
    if (!files?.length)  { this.log('Choose a CSV file first.'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text    = (e.target?.result as string) ?? '';
      const tickers = text.split(/[\r\n,]+/)
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0 && t !== 'TICKER');

      if (!tickers.length) { this.log('No tickers found in CSV.'); return; }

      this.log(`Uploading ${name} (${tickers.length} tickers)…`);
      this.watchlistService.createWatchlist(name, tickers).subscribe({
        next: () => {
          this.log(`✓ ${name} created with ${tickers.length} tickers.`);
          nameEl.value = '';
          fileEl.value = '';
          this.fileName.set('No file chosen');
          this.loadWatchlists();
        },
        error: (err) => this.log(`✗ Error: ${err?.error?.detail ?? 'Upload failed.'}`),
      });
    };
    reader.readAsText(files[0]);
  }

  confirmDelete(name: string) { this.deletingWl.set(name); }

  deleteWatchlist() {
    const name = this.deletingWl();
    if (!name) return;
    this.watchlistService.deleteWatchlist(name).subscribe({
      next: () => {
        this.log(`✓ Watchlist "${name}" deleted.`);
        this.deletingWl.set(null);
        this.loadWatchlists();
      },
      error: () => this.log(`✗ Failed to delete "${name}".`),
    });
  }

  private log(msg: string) {
    this.logs.update(l => [...l, msg]);
  }
}
