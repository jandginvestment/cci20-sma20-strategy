import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ScanStatusComponent } from '../scan-status/scan-status.component';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, ScanStatusComponent],
  template: `
    <nav class="navbar">
      <div class="nav-brand" routerLink="/">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="var(--bs-primary)" fill-opacity="0.2"/>
            <path d="M10 28L18 16L24 22L30 12" stroke="var(--bs-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="30" cy="12" r="3" fill="var(--bs-primary)"/>
          </svg>
        </div>
        <span class="brand-text">CCI/SMA Scanner</span>
      </div>

      <div class="nav-center">
        <app-scan-status></app-scan-status>
      </div>

      <div class="nav-actions">
        <a routerLink="/settings" class="icon-btn" title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </a>
        
        <div class="user-profile">
          <div class="avatar">{{ userInitials() }}</div>
          <span class="user-email">{{ authService.userEmail() }}</span>
        </div>

        <button class="btn-ghost btn-sm" (click)="logout()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: contents; }

    .navbar {
      height: 64px;
      border-bottom: 1px solid rgba(245,158,11,0.12);
      background: rgba(20, 18, 12, 0.9);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      flex-shrink: 0;
      z-index: 100;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      cursor: pointer;
      text-decoration: none;
    }
    .logo {
      width: 34px; height: 34px;
      border-radius: 9px;
      background: linear-gradient(135deg, #F59E0B, #D97706);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(245,158,11,0.35);
    }
    .brand-text {
      font-weight: 700;
      font-size: 1rem;
      color: #EDE4D8;
      letter-spacing: 0.01em;
    }
    .nav-center { flex: 1; display: flex; justify-content: center; }
    .nav-actions { display: flex; align-items: center; gap: 1rem; }

    .icon-btn {
      color: #817569;
      transition: color 0.2s, background 0.2s;
      display: flex;
      padding: 0.35rem;
      border-radius: 6px;
    }
    .icon-btn:hover { color: #F59E0B; background: rgba(245,158,11,0.1); }

    .user-profile { display: flex; align-items: center; gap: 0.65rem; }
    .avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F59E0B, #D97706);
      color: #141210;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .user-email {
      font-size: 0.82rem;
      color: #817569;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);

  userInitials() {
    const email = this.authService.userEmail();
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }

  logout() {
    this.authService.logout();
  }
}
