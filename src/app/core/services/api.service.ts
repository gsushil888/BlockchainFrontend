import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse, ApiError } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  get<T>(url: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(url).pipe(
      map(res => this.unwrap(res)),
      catchError(err => this.handleError(err))
    );
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      map(res => this.unwrap(res)),
      catchError(err => this.handleError(err))
    );
  }

  postForm<T>(url: string, form: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(url, form).pipe(
      map(res => this.unwrap(res)),
      catchError(err => this.handleError(err))
    );
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(url, body).pipe(
      map(res => this.unwrap(res)),
      catchError(err => this.handleError(err))
    );
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(url).pipe(
      map(res => this.unwrap(res)),
      catchError(err => this.handleError(err))
    );
  }

  private unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success || res.data === null || res.data === undefined) {
      throw { code: res.error?.code, message: res.error?.message, details: res.error?.details } as ApiError;
    }
    return res.data;
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    // Backend returned ApiResponse error envelope
    if (err.error?.error) {
      return throwError(() => err.error.error as ApiError);
    }
    // Network / unknown error
    return throwError(() => ({
      code: 'NETWORK_ERROR',
      message: err.message || 'Network error occurred'
    } as ApiError));
  }
}
