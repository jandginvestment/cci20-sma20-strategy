import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api/api.service';

interface User {
  id: string;
  email: string | null;
  created_at: string;
  cognito_sub: string;
  watchlists_count: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private apiService = inject(ApiService);
  
  users: User[] = [];
  displayedColumns: string[] = ['email', 'cognito_sub', 'created_at', 'watchlists_count', 'actions'];
  loading = true;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.apiService.get<User[]>('/admin/users').subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loading = false;
      }
    });
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user? All their watchlists will be permanently deleted.')) {
      this.apiService.delete(`/admin/users/${userId}`).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => {
          console.error('Failed to delete user', err);
          alert('Failed to delete user. Make sure you are not deleting the admin.');
        }
      });
    }
  }
}
