import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { ScanService } from '../../../core/api/scan.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-scan-status',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="status-pill" [class.scanning]="scanning()">
      <div class="dot"></div>
      @if (scanning()) {
        <span>Scanning...</span>
      } @else {
        <span>Scanned: {{ lastScan() ? (lastScan() | date:'shortTime') : 'Never' }}</span>
      }
    </div>
  `,
  styles: [`
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 0.375rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all 0.3s ease;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }
    .scanning .dot {
      background: var(--warning);
      box-shadow: 0 0 8px var(--warning);
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .scanning {
      border-color: rgba(245, 158, 11, 0.3);
      color: var(--warning);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
  `]
})
export class ScanStatusComponent implements OnInit, OnDestroy {
  private scanService = inject(ScanService);
  
  scanning = signal(false);
  lastScan = signal<string | null>(null);
  
  private intervalId: any;

  ngOnInit() {
    this.checkStatus();
    this.intervalId = setInterval(() => this.checkStatus(), 30000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkStatus() {
    this.scanService.getScanStatus().subscribe({
      next: (status) => {
        this.scanning.set(status.scan_in_progress);
        this.lastScan.set(status.last_scan);
      },
      error: (err) => console.error('Failed to fetch scan status', err)
    });
  }
}
