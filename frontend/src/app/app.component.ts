import { Component, OnInit, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { DisclaimerDialogComponent } from './shared/components/disclaimer-dialog/disclaimer-dialog.component';
import { AuthService } from './core/auth/auth.service';
import { TourComponent } from './shared/components/tour/tour.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TourComponent],
  template: `<router-outlet></router-outlet><app-tour></app-tour>`,
  styles: []
})
export class AppComponent implements OnInit {
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  constructor() {
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const accepted = sessionStorage.getItem('disclaimerAccepted');
      if (isAuth && !accepted) {
        setTimeout(() => {
          if (sessionStorage.getItem('disclaimerAccepted')) return;

          const dialogRef = this.dialog.open(DisclaimerDialogComponent, {
            disableClose: true, // User must click accept
            width: '500px',
            panelClass: 'disclaimer-panel'
          });

          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              sessionStorage.setItem('disclaimerAccepted', 'true');
            }
          });
        });
      }
    });
  }

  ngOnInit(): void {}
}
