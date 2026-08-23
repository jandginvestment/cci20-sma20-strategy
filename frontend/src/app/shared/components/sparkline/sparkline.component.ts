import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  template: `
    <svg width="50" height="20" viewBox="0 0 50 20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="positiveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--success)" />
          <stop offset="100%" stop-color="rgba(16, 185, 129, 0)" />
        </linearGradient>
        <linearGradient id="negativeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(239, 68, 68, 0)" />
          <stop offset="100%" stop-color="var(--danger)" />
        </linearGradient>
      </defs>

      <!-- Zero Line -->
      <line x1="0" y1="10" x2="50" y2="10" stroke="#374151" stroke-width="1" stroke-dasharray="2,2"/>

      <!-- Positive Area -->
      @if (positivePath()) {
        <path [attr.d]="positivePath()" fill="url(#positiveGrad)" opacity="0.3" />
      }

      <!-- Negative Area -->
      @if (negativePath()) {
        <path [attr.d]="negativePath()" fill="url(#negativeGrad)" opacity="0.3" />
      }

      <!-- Main Line -->
      <path [attr.d]="linePath()" stroke="currentColor" stroke-width="1" fill="none" vector-effect="non-scaling-stroke" />
    </svg>
  `,
  styles: [':host { display: inline-block; color: var(--text-secondary); }']
})
export class SparklineComponent {
  values = input.required<number[]>();

  // Map values (-250 to 250 CCI range) to 0-20 SVG height
  private mappedPoints = computed(() => {
    const vals = this.values() || [];
    if (vals.length === 0) return [];

    const w = 50;
    const h = 20;
    const max_cci = 250;
    const min_cci = -250;

    return vals.map((v, i) => {
      const x = (i / Math.max(1, vals.length - 1)) * w;
      const clampedV = Math.max(min_cci, Math.min(max_cci, v));
      // Map to 0-20. 0 CCI is exactly middle (y=10)
      const y = h - ((clampedV - min_cci) / (max_cci - min_cci) * h);
      return { x, y };
    });
  });

  linePath = computed(() => {
    const points = this.mappedPoints();
    if (points.length === 0) return '';
    return 'M ' + points.map(p => p.x + ',' + p.y).join(' L ');
  });

  positivePath = computed(() => {
    const points = this.mappedPoints();
    if (points.length === 0) return '';
    const zero = 10; // zero-line y coordinate
    let path = 'M ' + points[0].x + ',' + zero + ' L ';
    path += points.map(p => p.x + ',' + Math.min(p.y, zero)).join(' L ');
    path += ' L ' + points[points.length - 1].x + ',' + zero + ' Z';
    return path;
  });

  negativePath = computed(() => {
    const points = this.mappedPoints();
    if (points.length === 0) return '';
    const zero = 10; // zero-line y coordinate
    let path = 'M ' + points[0].x + ',' + zero + ' L ';
    path += points.map(p => p.x + ',' + Math.max(p.y, zero)).join(' L ');
    path += ' L ' + points[points.length - 1].x + ',' + zero + ' Z';
    return path;
  });
}
