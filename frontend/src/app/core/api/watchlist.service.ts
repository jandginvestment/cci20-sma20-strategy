import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface WatchlistMeta {
  name: string;
  id: string;
  created_at: string;
}

export interface SignalResult {
  ticker: string;
  close: number;
  cci_20: number;
  sma_20: number;
  cci_history: number[];
  yearly_low_pct: number;
  monthly_low_pct: number;
  weekly_low_pct: number;
}

export interface WatchlistResults {
  watchlist: string;
  scanned_at: string;
  results: SignalResult[];
}

export interface HistoryRun {
  id: string;
  scanned_at: string;
  ticker_count: number;
}

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private api = inject(ApiService);

  getWatchlists(): Observable<WatchlistMeta[]> {
    return this.api.get<WatchlistMeta[]>('/watchlists');
  }

  getResults(name: string): Observable<WatchlistResults> {
    return this.api.get<WatchlistResults>(`/watchlists/${name}/results`);
  }

  getHistory(name: string): Observable<HistoryRun[]> {
    return this.api.get<HistoryRun[]>(`/watchlists/${name}/history`);
  }

  getHistoricalResults(name: string, runId: string): Observable<WatchlistResults> {
    return this.api.get<WatchlistResults>(`/watchlists/${name}/history/${runId}`);
  }

  createWatchlist(name: string, file: File): Observable<WatchlistMeta> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.postForm<WatchlistMeta>(`/watchlists/${name}`, formData);
  }

  deleteWatchlist(name: string): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(`/watchlists/${name}`);
  }
}
