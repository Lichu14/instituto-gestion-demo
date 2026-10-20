import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../services/auth.service';
import { Login } from './login';

describe('Login feedback', () => {
  const login = vi.fn();
  const navigate = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    navigate.mockReset();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: { login } },
        { provide: Router, useValue: { navigate } },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders an asynchronous 401, restores the button and clears the message on retry', async () => {
    const first = new Subject();
    const retry = new Subject();
    login.mockReturnValueOnce(first).mockReturnValueOnce(retry);
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const submit = () => element.querySelector('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    submit();
    await fixture.whenStable();
    expect(element.querySelector('button')!.disabled).toBe(true);
    expect(element.querySelector('button')!.textContent).toContain('Ingresando…');

    first.error(new HttpErrorResponse({ status: 401 }));
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')!.textContent).toBe('Email o contraseña incorrectos.');
    expect(element.querySelector('button')!.disabled).toBe(false);
    expect(element.querySelector('button')!.textContent).toContain('Explorar demo');
    expect(navigate).not.toHaveBeenCalled();

    submit();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelector('button')!.disabled).toBe(true);
    retry.complete();
    await fixture.whenStable();
  });

  it('shows a temporary limit message and restores the button on 429', async () => {
    const response = new Subject();
    login.mockReturnValue(response);
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.login();
    response.error(new HttpErrorResponse({ status: 429 }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toBe('Demasiados intentos. Esperá unos minutos e intentá nuevamente.');
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
    const retry = new Subject();
    login.mockReturnValue(retry);
    fixture.componentInstance.login();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    retry.complete();
  });

  it.each([0, 500])('shows a nontechnical message for status %s', async (status) => {
    const response = new Subject();
    login.mockReturnValue(response);
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.login();
    response.error(new HttpErrorResponse({ status, error: 'technical details' }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toBe('No pudimos iniciar sesión. Intentá nuevamente.');
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
  });

  it('preserves token storage and navigation on success', async () => {
    const response = new Subject();
    login.mockReturnValue(response);
    const store = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.componentInstance.email = 'login-test@example.invalid';
    fixture.componentInstance.password = 'test-password';
    fixture.componentInstance.login();
    response.next({ access_token: 'test-token', user: {} });
    response.complete();
    await fixture.whenStable();
    expect(login).toHaveBeenCalledWith('login-test@example.invalid', 'test-password');
    expect(store).toHaveBeenCalledWith('access_token', 'test-token');
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
  });
});

