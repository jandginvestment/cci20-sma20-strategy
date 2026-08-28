import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // We should ideally return a boolean or UrlTree. If isAdmin is a signal, we can call it.
  if (authService.isAdmin()) {
    return true;
  }
  
  return router.parseUrl('/dashboard');
};
