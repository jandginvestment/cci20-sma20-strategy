import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { DisclaimerDialogComponent } from './shared/components/disclaimer-dialog/disclaimer-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent {
  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    if (!sessionStorage.getItem('disclaimerAccepted')) {
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
    }
  }
}
