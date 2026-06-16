import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, ApiError,
  AuthResponse, AuthTokenResponse, OtpPendingResponse
} from '../models/api-response.model';

export interface SessionUser {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  permissions: string[];
}

export interface LoginPayload {
  username?: string;
  email?: string;
  mobile?: string;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = `/api/auth`;
  private readonly TOKEN_KEY   = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY    = 'auth_user';

  private currentUser$ = new BehaviorSubject<SessionUser | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.currentUser$.next(this.storedUser());
    if (this.isBrowser()) {
      window.addEventListener('storage', (e) => {
        if (e.key === this.TOKEN_KEY && !e.newValue) { this.clear(); this.router.navigate(['/login']); }
      });
      setInterval(() => {
        if (this.currentUser$.getValue() && !this.getToken()) { this.clear(); this.router.navigate(['/login']); }
      }, 2000);
    }
  }

  // ── Login: returns OtpPendingResponse or AuthTokenResponse ─────────────
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/login`, payload)
      .pipe(
        map(res => {
          if (!res.success || !res.data) {
            throw { code: res.error?.code ?? 'LOGIN_FAILED', message: res.error?.message ?? 'Login failed.', details: res.error?.details ?? null } as ApiError;
          }
          if (!res.data.otpRequired) this.persist(res.data as AuthTokenResponse);
          return res.data;
        }),
        catchError(err => throwError(() => this.extractError(err)))
      );
  }

  // ── Verify OTP (after login or register) ───────────────────────────────────────────
  verifyOtp(loginToken: string, otp: string): Observable<AuthTokenResponse> {
    return this.http.post<ApiResponse<AuthTokenResponse>>(`${this.API}/verify-otp`, { loginToken, otp })
      .pipe(
        map(res => {
          if (!res.success || !res.data) {
            throw {
              code:    res.error?.code    ?? 'OTP_ERROR',
              message: res.error?.message ?? 'OTP verification failed.',
              details: res.error?.details ?? null
            } as ApiError;
          }
          this.persist(res.data);
          return res.data;
        }),
        catchError(err => throwError(() => this.extractError(err)))
      );
  }

  // ── Register: multipart/form-data ──────────────────────────────────────
  register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    mobile?: string;
    role?: string;
    profilePic?: File | null;
  }): Observable<AuthResponse> {
    const form = new FormData();
    form.append('firstName', data.firstName);
    form.append('lastName',  data.lastName);
    form.append('email',     data.email);
    form.append('password',  data.password);
    if (data.mobile)     form.append('mobile',     data.mobile);
    if (data.role)       form.append('role',       data.role);
    if (data.profilePic) form.append('profilePic', data.profilePic);

    return this.http.post<ApiResponse<AuthResponse>>(`${this.API}/register`, form)
      .pipe(
        map(res => {
          if (!res.success || !res.data) {
            throw { code: res.error?.code ?? 'REGISTER_FAILED', message: res.error?.message ?? 'Registration failed.', details: res.error?.details ?? null } as ApiError;
          }
          if (!res.data.otpRequired) this.persist(res.data as AuthTokenResponse);
          return res.data;
        }),
        catchError(err => throwError(() => this.extractError(err)))
      );
  }

  logout(): void {
    this.http.post(`${this.API}/logout`, {}).subscribe();
    this.clear();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    const enc = sessionStorage.getItem(this.TOKEN_KEY);
    if (!enc) return null;
    if (!environment.encryption) return enc;
    try { return atob(enc); } catch { return null; }
  }

  getUser(): SessionUser | null    { return this.currentUser$.getValue(); }
  isLoggedIn(): boolean             { return !!this.getToken(); }
  isAdmin(): boolean                { return this.getUser()?.role === 'ADMIN'; }
  hasPermission(p: string): boolean { return this.getUser()?.permissions.includes(p) ?? false; }
  userChange(): Observable<SessionUser | null> { return this.currentUser$.asObservable(); }

  private persist(res: AuthTokenResponse): void {
    if (this.isBrowser()) {
      const encode = (v: string) => environment.encryption ? btoa(v) : v;
      sessionStorage.setItem(this.TOKEN_KEY,   encode(res.accessToken));
      sessionStorage.setItem(this.REFRESH_KEY, encode(res.refreshToken));
      sessionStorage.setItem(this.USER_KEY,    encode(JSON.stringify(res)));
    }
    this.currentUser$.next({
      accessToken:  res.accessToken,
      refreshToken: res.refreshToken,
      username:     res.username,
      role:         res.role,
      permissions:  res.permissions ?? []
    });
  }

  private clear(): void {
    if (this.isBrowser()) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    }
    this.currentUser$.next(null);
  }

  private storedUser(): SessionUser | null {
    if (!this.isBrowser()) return null;
    const raw = sessionStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      const decoded = environment.encryption ? atob(raw) : raw;
      return JSON.parse(decoded);
    } catch { return null; }
  }

  private isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  private extractError(err: unknown): ApiError {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as ApiResponse<unknown>;
      return {
        code:    body?.error?.code    ?? String(err.status),
        message: body?.error?.message ?? err.message ?? 'Something went wrong.',
        details: body?.error?.details ?? null
      };
    }
    return err as ApiError;
  }
}
