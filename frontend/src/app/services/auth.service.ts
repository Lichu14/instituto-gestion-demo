import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from '../core/api-config';

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    activo: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${getApiBaseUrl()}/auth`;

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email,
      password,
    });
  }

  logout(): void {
    localStorage.removeItem('access_token');
  }
}
