import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-disclaimer-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './disclaimer-dialog.component.html',
  styleUrls: ['./disclaimer-dialog.component.scss']
})
export class DisclaimerDialogComponent {
  constructor(public dialogRef: MatDialogRef<DisclaimerDialogComponent>) {}

  accept(): void {
    this.dialogRef.close(true);
  }
}
