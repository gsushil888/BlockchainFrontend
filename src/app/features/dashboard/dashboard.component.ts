import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner.component';
import { ApiError } from '../../core/models/api-response.model';
import { BlockchainComponent } from './blockchain.component';
import { AuditTrailComponent } from './audit-trail.component';

export interface UserDto {
  id: number;
  username: string;
  email: string;
  role: string;
  enabled: boolean;
  profilePicUrl?: string | null;
}

export type Page = 'overview' | 'chain' | 'mine' | 'verify' | 'docs' | 'users' | 'profile' | 'audit-trail';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, BlockchainComponent, AuditTrailComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService  = inject(ApiService);
  private toast       = inject(ToastService);

  sidebarOpen = true;
  activePage: Page = 'overview';

  profile: UserDto | null = null;
  users: UserDto[] = [];
  profileLoading = true;
  usersLoading   = false;

  readonly navItems: { id: Page; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: 'overview', label: 'Overview',      icon: 'chart'  },
    { id: 'chain',    label: 'Chain Explorer', icon: 'chain'  },
    { id: 'mine',     label: 'Mine Block',     icon: 'bolt'   },
    { id: 'verify',   label: 'Verify Chain',   icon: 'shield' },
    { id: 'docs',     label: 'Document Chain', icon: 'doc'    },
    { id: 'audit-trail', label: 'Audit Trail',   icon: 'audit'  },
    { id: 'users',    label: 'Users',          icon: 'users', adminOnly: true },
    { id: 'profile',  label: 'My Profile',     icon: 'user'   },
  ];

  readonly pageTitles: Record<Page, string> = {
    overview: 'Overview',
    chain:    'Chain Explorer',
    mine:     'Mine a Block',
    verify:   'Verify Chain',
    docs:     'Document Chain',
    'audit-trail': 'Audit Trail',
    users:    'All Users',
    profile:  'My Profile'
  };

  ngOnInit(): void {
    this.loadProfile();
    if (this.authService.isAdmin()) this.loadUsers();
  }

  private loadProfile(): void {
    this.apiService.get<UserDto>('/api/user/profile').subscribe({
      next:  (p) => { this.profile = p; this.profileLoading = false; },
      error: (e: ApiError) => {
        this.toast.error(e?.message ?? 'Failed to load profile.');
        this.profileLoading = false;
      }
    });
  }

  private loadUsers(): void {
    this.usersLoading = true;
    this.apiService.get<UserDto[]>('/api/admin/users').subscribe({
      next:  (u) => { this.users = u; this.usersLoading = false; },
      error: (e: ApiError) => {
        this.toast.error(e?.message ?? 'Failed to load users.');
        this.usersLoading = false;
      }
    });
  }

  navigate(page: Page): void    { this.activePage = page; }
  toggleSidebar(): void          { this.sidebarOpen = !this.sidebarOpen; }
  isAdmin(): boolean             { return this.authService.isAdmin(); }
  visibleNav()                   { return this.navItems.filter(n => !n.adminOnly || this.isAdmin()); }

  logout(): void {
    this.authService.logout();
    this.toast.info('You have been signed out.');
  }
}
