import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="layout-container" style="justify-content: center; align-items: center; background: var(--bg-primary);">
      <div class="card" style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <div class="spinner"></div>
        <p>Authenticating...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (code && state) {
      const success = await this.authService.handleCallback(code, state);
      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/login']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }
}
