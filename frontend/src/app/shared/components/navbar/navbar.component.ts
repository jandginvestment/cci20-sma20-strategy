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
    .navbar {
      height: 64px;
      border-bottom: 1px solid var(--bs-border-color);
      background: rgba(var(--bs-body-bg-rgb), 0.8);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
    }
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      text-decoration: none;
    }
    .brand-text {
      font-weight: 600;
      font-size: 1.125rem;
      color: var(--bs-body-color);
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .icon-btn {
      color: var(--bs-secondary-color);
      transition: color 0.2s ease;
      display: flex;
    }
    .icon-btn:hover {
      color: var(--bs-primary);
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bs-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .user-email {
      font-size: 0.875rem;
      color: var(--bs-secondary-color);
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-sm {
      padding: 0.375rem 0.5rem;
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
