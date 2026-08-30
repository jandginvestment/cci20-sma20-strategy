import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TourService {
  readonly step   = signal(0);
  readonly active = signal(false);

  /** Auto-start: only if user hasn't completed the tour before */
  start() {
    if (localStorage.getItem('cci_tour_done')) return;
    this.step.set(0);
    this.active.set(true);
  }

  /** Manual re-trigger from "Take Tour" — ignores completion flag */
  startForced() {
    this.step.set(0);
    this.active.set(true);
  }

  advance() { this.step.update(s => s + 1); }
  pause()   { this.active.set(false); }
  resume()  { this.active.set(true); }

  finish() {
    localStorage.setItem('cci_tour_done', '1');
    this.step.set(0);
    this.active.set(false);
  }
}
