import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  private _isAuthenticated = signal<boolean>(!!localStorage.getItem('access_token'));
  public isAuthenticated = computed(() => this._isAuthenticated());
  
  private _userEmail = signal<string | null>(this.parseEmailFromToken());
  public userEmail = computed(() => this._userEmail());

  private _isAdmin = signal<boolean>(false);
  public isAdmin = computed(() => this._isAdmin());

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }

  constructor() {
    if (this._isAuthenticated()) {
      this.fetchMe();
    }
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async login(): Promise<void> {
    const state = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    localStorage.setItem('auth_state', state);
    localStorage.setItem('code_verifier', codeVerifier);

    const { domain, clientId, redirectUri, scopes } = environment.cognito;
    const url = new URL(`${domain}/oauth2/authorize`);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes.join(' '));
    url.searchParams.append('state', state);
    url.searchParams.append('code_challenge', codeChallenge);
    url.searchParams.append('code_challenge_method', 'S256');

    window.location.href = url.toString();
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    const savedState = localStorage.getItem('auth_state');
    const codeVerifier = localStorage.getItem('code_verifier');

    if (!savedState || state !== savedState || !codeVerifier) {
      console.error('Invalid state or missing code verifier');
      return false;
    }

    try {
      const { domain, clientId, redirectUri } = environment.cognito;
      const tokenUrl = `${domain}/oauth2/token`;
      
      const body = new URLSearchParams();
      body.append('grant_type', 'authorization_code');
      body.append('client_id', clientId);
      body.append('code', code);
      body.append('redirect_uri', redirectUri);
      body.append('code_verifier', codeVerifier);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });

      if (!response.ok) {
        throw new Error('Failed to exchange token');
      }

      const data = await response.json();
      
      localStorage.setItem('access_token', data.access_token);
      if (data.id_token) localStorage.setItem('id_token', data.id_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      
      this._isAuthenticated.set(true);
      this._userEmail.set(this.parseEmailFromToken());
      
      localStorage.removeItem('auth_state');
      localStorage.removeItem('code_verifier');
      
      await this.fetchMe();
      
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async fetchMe(): Promise<void> {
    try {
      const response = await fetch(`${environment.apiUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        this._isAdmin.set(!!data.is_admin);
      }
    } catch (e) {
      console.error('Failed to fetch /me', e);
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    this._isAuthenticated.set(false);
    this._userEmail.set(null);
    this._isAdmin.set(false);

    const { domain, clientId, logoutUri } = environment.cognito;
    const url = `${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    window.location.href = url;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private parseEmailFromToken(): string | null {
    const token = localStorage.getItem('id_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email || null;
    } catch {
      return null;
    }
  }
}
