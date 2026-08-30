import { Component, computed, inject } from '@angular/core';
import { TourService } from '../../../core/tour.service';

interface TourStep {
  sel: string | null;
  title: string;
  body: string;
}

@Component({
  selector: 'app-tour',
  standalone: true,
  template: `
    @if (svc.active()) {
      <!-- Backdrop (step 0: full dim; steps 1+: transparent, pointer-events blocked) -->
      <div class="tour-backdrop" [class.has-spot]="!!spotRect()"></div>

      <!-- Spotlight box (steps 1–5) -->
      @if (spotRect(); as r) {
        <div class="tour-spotlight"
             [style.top.px]="r.y - 10"
             [style.left.px]="r.x - 10"
             [style.width.px]="r.width + 20"
             [style.height.px]="r.height + 20">
        </div>
      }

      <!-- Tooltip card -->
      <div class="tour-card" [style]="cardStyle()">
        <div class="tour-header">
          <span class="tour-badge">{{ svc.step() + 1 }} / {{ STEPS.length }}</span>
          <button class="tour-close" (click)="skip()" title="Skip tour">✕</button>
        </div>
        <h4 class="tour-title">{{ current().title }}</h4>
        <p class="tour-body">{{ current().body }}</p>
        <div class="tour-actions">
          <button class="tour-skip-btn" (click)="skip()">Skip tour</button>
          <button class="tour-next-btn" (click)="next()">
            {{ isLast() ? 'Done ✓' : nextLabel() }}
          </button>
        </div>
        <!-- Arrow pointer toward spotlight (steps 1+) -->
        @if (arrowDir()) {
          <div class="tour-arrow" [class]="'arrow-' + arrowDir()"></div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }

    /* Full-screen backdrop */
    .tour-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      z-index: 9990;
      pointer-events: none;
    }
    /* When there's a spotlight, backdrop lets pointer events through to the card */
    .tour-backdrop.has-spot { background: transparent; }

    /* Spotlight: box-shadow trick creates the dim surround */
    .tour-spotlight {
      position: fixed;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.72),
                  0 0 0 2px rgba(245, 158, 11, 0.5);
      z-index: 9991;
      pointer-events: none;
      transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
    }

    /* Tooltip card */
    .tour-card {
      position: fixed;
      width: 340px;
      background: rgba(22, 18, 12, 0.97);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 12px;
      padding: 1.1rem 1.25rem 1rem;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245,158,11,0.1);
      backdrop-filter: blur(16px);
      animation: tour-fade-in 0.22s ease;
    }
    @keyframes tour-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .tour-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.6rem;
    }
    .tour-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #F59E0B;
      text-transform: uppercase;
    }
    .tour-close {
      background: transparent;
      border: none;
      color: #5a4a38;
      cursor: pointer;
      font-size: 0.8rem;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.18s;
    }
    .tour-close:hover { color: #EDE4D8; }

    .tour-title {
      font-size: 1rem;
      font-weight: 700;
      color: #EDE4D8;
      margin: 0 0 0.45rem;
    }
    .tour-body {
      font-size: 0.84rem;
      color: #B7C8E1;
      line-height: 1.55;
      margin: 0 0 0.9rem;
    }

    .tour-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .tour-skip-btn {
      background: transparent;
      border: none;
      color: #5a4a38;
      font-size: 0.78rem;
      cursor: pointer;
      padding: 0;
      transition: color 0.18s;
    }
    .tour-skip-btn:hover { color: #817569; }
    .tour-next-btn {
      background: linear-gradient(135deg, #F59E0B, #D97706);
      color: #141210;
      border: none;
      border-radius: 7px;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0.42rem 1rem;
      cursor: pointer;
      transition: opacity 0.18s;
      white-space: nowrap;
    }
    .tour-next-btn:hover { opacity: 0.88; }

    /* Arrow pointer */
    .tour-arrow {
      position: absolute;
      width: 0; height: 0;
    }
    .arrow-up {
      top: -8px; left: 24px;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid rgba(245,158,11,0.35);
    }
    .arrow-down {
      bottom: -8px; left: 24px;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid rgba(245,158,11,0.35);
    }
  `]
})
export class TourComponent {
  readonly svc = inject(TourService);

  readonly STEPS: TourStep[] = [
    {
      sel: null,
      title: 'Welcome to CCI/SMA Scanner',
      body: 'This app scans NSE stocks using CCI(20) and SMA(20) to spot key technical signals — Reversal Zone, Recovery, Bullish Setup, and Overbought. Let\'s take a quick look around.'
    },
    {
      sel: '.sidebar-nav',
      title: 'Your Watchlists',
      body: 'The sidebar lists your custom watchlists. Click any watchlist name to load its stocks and their signals. Click a watchlist now to continue the tour on that page.'
    },
    {
      sel: '.sig-filter-row',
      title: 'Signal Filters',
      body: 'Filter the table instantly by signal type. Reversal Zone (CCI < −100, below SMA) often precedes a bounce. Recovery and Bullish Setup show momentum building above SMA.'
    },
    {
      sel: '.row.g-2.mb-3',
      title: 'Near-Low Counters',
      body: 'These cards count how many stocks are within 10% / 5% / 2% of their 1-year, 1-month, and 1-week lows. Click any card to instantly filter the table to those stocks.'
    },
    {
      sel: '.scanner-table',
      title: 'The Table',
      body: 'Each row shows the closing price, CCI(20) sparkline with value, SMA direction arrow, and the 1-Yr / 1-Mo / 1-Wk low prices with a distance bar and percentage.'
    },
    {
      sel: 'a[routerLink="/settings"]',
      title: 'Open Settings',
      body: 'Click Settings in the sidebar to manage your watchlists. The tour will continue there — or press Next to go directly.'
    },
    {
      sel: '.upload-row',
      title: 'Add Your Watchlist',
      body: 'Enter a watchlist name, choose a CSV file of NSE ticker symbols (one per line, e.g. INFY.NS), then click Upload. The scanner will include it in the next run.'
    },
  ];

  readonly current  = computed(() => this.STEPS[this.svc.step()]);
  readonly isLast   = computed(() => this.svc.step() === this.STEPS.length - 1);

  readonly spotRect = computed(() => {
    if (!this.svc.active()) return null;       // depend on active so it re-runs on resume
    const sel = this.STEPS[this.svc.step()].sel;
    if (!sel) return null;
    return document.querySelector(sel)?.getBoundingClientRect() ?? null;
  });

  readonly arrowDir = computed((): 'up' | 'down' | null => {
    const r = this.spotRect();
    if (!r) return null;
    const wH = window.innerHeight;
    return r.bottom + 220 < wH ? 'up' : 'down';
  });

  readonly cardStyle = computed(() => {
    const r = this.spotRect();
    if (!r) {
      return 'top:50%;left:50%;transform:translate(-50%,-50%)';
    }
    const PAD = 16, CARD_W = 340, CARD_H = 210;
    const wH = window.innerHeight, wW = window.innerWidth;
    const below = r.bottom + PAD + CARD_H < wH;
    const top  = below ? r.bottom + PAD : r.top - PAD - CARD_H;
    const left = Math.max(PAD, Math.min(r.left, wW - CARD_W - PAD));
    return `top:${top}px;left:${left}px`;
  });

  nextLabel(): string {
    if (this.svc.step() === 1) return 'Got it — pick a watchlist →';
    if (this.svc.step() === 5) return 'Got it — open Settings →';
    return 'Next →';
  }

  next() {
    if (this.isLast()) { this.svc.finish(); return; }
    this.svc.advance();
    // Pause at step 2 (needs watchlist page) and step 6 (needs settings page)
    if (this.svc.step() === 2 || this.svc.step() === 6) this.svc.pause();
  }

  skip() { this.svc.finish(); }
}
