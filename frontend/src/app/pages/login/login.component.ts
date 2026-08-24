import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-container">
      <div class="bg-animation"></div>
      <div class="card login-card">
        <div class="logo">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="var(--bs-primary)" fill-opacity="0.2"/>
            <path d="M10 28L18 16L24 22L30 12" stroke="var(--bs-primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="30" cy="12" r="3" fill="var(--bs-primary)"/>
          </svg>
        </div>
        <h1>CCI/SMA Scanner</h1>
        <p class="subtitle">Institutional-grade CCI(20) + SMA(20) signals for Indian equities</p>
        
        <button class="btn btn-primary login-btn" (click)="login()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 3H21V9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9 21H3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 3L14 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 21L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Sign in with AWS Cognito
        </button>

        <div class="footer">
          Powered by yfinance &middot; NSE/BSE &middot; AWS
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      position: relative;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--bs-body-bg);
    }
    
    .bg-animation {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.05), transparent 30%);
      animation: rotate-bg 30s linear infinite;
      z-index: 1;
    }
    
    @keyframes rotate-bg {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .login-card {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 420px;
      text-align: center;
      padding: 3rem 2rem;
    }
    
    .logo {
      margin-bottom: 1.5rem;
      display: inline-flex;
    }
    
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(to right, #fff, var(--bs-secondary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .subtitle {
      color: var(--bs-secondary-color);
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 2.5rem;
    }
    
    .login-btn {
      width: 100%;
      font-size: 1rem;
      padding: 0.875rem;
      margin-bottom: 2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .footer {
      font-size: 0.75rem;
      color: var(--bs-secondary-color);
      opacity: 0.7;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  
  login() {
    this.authService.login();
  }
}
