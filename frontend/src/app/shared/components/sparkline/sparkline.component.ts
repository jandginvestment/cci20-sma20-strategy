import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

const W = 80, H = 30, MAX = 250, MIN = -250;
let _uid = 0;

@Component({
  selector: 'app-sparkline',
  standalone: true,
  template: `
    <div class="spark-wrap">
      <svg [attr.width]="W" [attr.height]="H" [attr.viewBox]="'0 0 ' + W + ' ' + H"
           preserveAspectRatio="none" style="display:block;">
        <defs>
          <!-- positive fill gradient -->
          <linearGradient [attr.id]="'pg' + uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#10b981" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
          </linearGradient>
          <!-- negative fill gradient -->
          <linearGradient [attr.id]="'ng' + uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#ef4444" stop-opacity="0"/>
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.35"/>
          </linearGradient>
        </defs>

        <!-- Zero line -->
        <line x1="0" [attr.y1]="zeroY" [attr.x2]="W" [attr.y2]="zeroY"
              stroke="rgba(255,255,255,0.12)" stroke-width="0.8" stroke-dasharray="3,3"/>

        <!-- +100 / -100 zone lines -->
        <line x1="0" [attr.y1]="p100Y" [attr.x2]="W" [attr.y2]="p100Y"
              stroke="rgba(16,185,129,0.2)" stroke-width="0.6" stroke-dasharray="2,4"/>
        <line x1="0" [attr.y1]="n100Y" [attr.x2]="W" [attr.y2]="n100Y"
              stroke="rgba(239,68,68,0.2)" stroke-width="0.6" stroke-dasharray="2,4"/>

        <!-- Positive area fill -->
        @if (positivePath()) {
          <path [attr.d]="positivePath()" [attr.fill]="'url(#pg' + uid + ')'" />
        }

        <!-- Negative area fill -->
        @if (negativePath()) {
          <path [attr.d]="negativePath()" [attr.fill]="'url(#ng' + uid + ')'" />
        }

        <!-- Main line -->
        <path [attr.d]="linePath()" [attr.stroke]="lineColor()"
              stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- End-point dot -->
        @if (endPoint()) {
          <circle [attr.cx]="endPoint()!.x" [attr.cy]="endPoint()!.y"
                  r="2.5" [attr.fill]="lineColor()" stroke="#141210" stroke-width="1.2"/>
        }
      </svg>

      <!-- Current value badge -->
      <span class="spark-val" [class.pos]="lastVal() > 0" [class.neg]="lastVal() < 0">
        {{ lastVal() | number:'1.0-0' }}
      </span>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .spark-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .spark-val {
      font-size: 0.72rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      min-width: 34px;
      text-align: right;
      color: #817569;
      &.pos { color: #10b981; }
      &.neg { color: #ef4444; }
    }
  `],
  imports: [DecimalPipe]
})
export class SparklineComponent {
  values = input.required<number[]>();

  readonly W = W;
  readonly H = H;

  // Stable per-instance ID to avoid duplicate gradient IDs in the page
  readonly uid = String(++_uid);

  readonly zeroY = H - ((0    - MIN) / (MAX - MIN) * H);
  readonly p100Y = H - ((100  - MIN) / (MAX - MIN) * H);
  readonly n100Y = H - ((-100 - MIN) / (MAX - MIN) * H);

  private readonly pts = computed(() => {
    const vals = this.values() ?? [];
    if (!vals.length) return [];
    return vals.map((v, i) => ({
      x: (i / Math.max(1, vals.length - 1)) * W,
      y: H - ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN) * H)
    }));
  });

  lastVal = computed(() => this.values()?.at(-1) ?? 0);

  lineColor = computed(() => {
    const v = this.lastVal();
    if (v > 0) return '#10b981';
    if (v < 0) return '#ef4444';
    return '#817569';
  });

  endPoint = computed(() => this.pts().at(-1) ?? null);

  linePath = computed(() => {
    const p = this.pts();
    if (!p.length) return '';
    return 'M ' + p.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' L ');
  });

  positivePath = computed(() => {
    const p = this.pts();
    if (!p.length) return '';
    const z = this.zeroY;
    const last = p.at(-1)!;
    return `M ${p[0].x},${z} ` +
           p.map(pt => `L ${pt.x.toFixed(1)},${Math.min(pt.y, z).toFixed(1)}`).join(' ') +
           ` L ${last.x},${z} Z`;
  });

  negativePath = computed(() => {
    const p = this.pts();
    if (!p.length) return '';
    const z = this.zeroY;
    const last = p.at(-1)!;
    return `M ${p[0].x},${z} ` +
           p.map(pt => `L ${pt.x.toFixed(1)},${Math.max(pt.y, z).toFixed(1)}`).join(' ') +
           ` L ${last.x},${z} Z`;
  });
}
