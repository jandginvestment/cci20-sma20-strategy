import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

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
    return this.api.post<ScanTriggerResult>('/scan', {});
  }

  getScanStatus(): Observable<ScanStatus> {
    return this.api.get<ScanStatus>('/scan/status');
  }
}
