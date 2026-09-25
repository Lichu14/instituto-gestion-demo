import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from '../services/auth.service';

describe('Destinatario de JWT y contraseña', () => {
  const navigate = vi.fn();
  const prod = 'https://instituto-gestion-demo-api.vercel.app';
  let http: HttpClient;
  let requests: HttpTestingController;
  beforeEach(() => {
    navigate.mockReset();
    localStorage.setItem('access_token', 'test-token');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: Router, useValue: { navigate } },
    ] });
    http = TestBed.inject(HttpClient); requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { requests.verify(); vi.unstubAllGlobals(); localStorage.clear(); });
  function production() {
    vi.stubGlobal('window', { location: { hostname: 'instituto.vercel.app', search: '?apiBaseUrl=https://attacker.example' }, localStorage });
  }
  it.each([
    'https://attacker.example/api', `${prod}.attacker.example/api`,
    `${prod}@attacker.example/api`, 'https://user:password@instituto-gestion-demo-api.vercel.app/api',
    'https://instituto-gestion-demo-api-evil.vercel.app/api', `${prod}:8443/api`,
    'http://instituto-gestion-demo-api.vercel.app/api', 'http://localhost:3001/api',
    `${prod}/api-evil`, `${prod}/api/../other`, '//attacker.example/api',
    'javascript:alert(1)', 'file:///api', 'data:text/plain,token',
  ])('no envía Authorization ni cierra la sesión por 401 externo: %s', url => {
    production();
    http.get(url, { headers: new HttpHeaders({ Authorization: 'Bearer test-token' }) }).subscribe({ error: () => {} });
    const req = requests.expectOne(url);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('access_token')).toBe('test-token');
    expect(navigate).not.toHaveBeenCalled();
  });
  it.each(['localhost', 'instituto.vercel.app'])('login y peticiones legítimas usan el destino fijo en %s', hostname => {
    vi.stubGlobal('window', { location: { hostname, search: '?apiBaseUrl=https://attacker.example' }, localStorage });
    localStorage.setItem('demo.apiBaseUrl', 'https://instituto-gestion-demo-api.attacker.example');
    const base = hostname === 'localhost' ? 'http://localhost:3001' : prod;
    TestBed.inject(AuthService).login('test@example.invalid', 'test-only-password').subscribe();
    const login = requests.expectOne(`${base}/api/auth/login`);
    expect(login.request.body).toEqual({ email: 'test@example.invalid', password: 'test-only-password' });
    login.flush({ access_token: 'new-token', user: {} });
    expect(localStorage.getItem('demo.apiBaseUrl')).toBeNull();
    http.get(`${base}/api/pagos/32/comprobante.pdf`).subscribe({ error: () => {} });
    const pdf = requests.expectOne(`${base}/api/pagos/32/comprobante.pdf`);
    expect(pdf.request.headers.get('Authorization')).toBe('Bearer test-token');
    pdf.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
