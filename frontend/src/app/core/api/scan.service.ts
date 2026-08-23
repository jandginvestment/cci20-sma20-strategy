import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
export interface ScanStatus {
  last_scan: string | null;
  watchlist: string | null;
  ticker_count: number;
  scan_in_progress: boolean;
}

export interface ScanTriggerResult {
  status: string;
  triggered_by: string;
}

@Injectable({ providedIn: 'root' })
export class ScanService {
  private api = inject(ApiService);

  triggerScan(): Observable<ScanTriggerResult> {
    return this.api.post<ScanTriggerResult>('/scan/trigger', {});
  }

  getScanStatus(): Observable<ScanStatus> {
    return of({
      last_scan: null,
      watchlist: null,
      ticker_count: 0,
      scan_in_progress: false
    });
  }
}
