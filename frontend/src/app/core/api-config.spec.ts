import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './api-config';

describe('API base URL', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockWindow(hostname: string, search = '', stored: string | null = null) {
    const localStorage = {
      getItem: vi.fn(() => stored),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('window', { location: { hostname, search }, localStorage });
    return localStorage;
  }

  it.each(['localhost', '127.0.0.1', '[::1]'])('uses the local login endpoint on %s', (hostname) => {
    mockWindow(hostname);
    expect(`${getApiBaseUrl()}/auth/login`).toBe('http://localhost:3001/api/auth/login');
  });

  it('preserves the production login endpoint', () => {
    mockWindow('instituto.vercel.app');
    expect(`${getApiBaseUrl()}/auth/login`).toBe(
      'https://instituto-gestion-demo-api.vercel.app/api/auth/login',
    );
  });

  it.each([
    'http://localhost:3001',
    'http://localhost:3001/',
    'http://localhost:3001/api',
    'http://localhost:3001/api/',
    'http://localhost:3001/api/api///',
    'https://instituto-gestion-demo-api.vercel.app/api',
  ])('ignores query and persisted overrides: %s', (override) => {
    const expected = 'http://localhost:3001/api';
    const queryStorage = mockWindow('localhost', `?apiBaseUrl=${encodeURIComponent(override)}`);
    expect(getApiBaseUrl()).toBe(expected);
    expect(queryStorage.removeItem).toHaveBeenCalledWith('demo.apiBaseUrl');

    const savedStorage = mockWindow('localhost', '', override);
    expect(getApiBaseUrl()).toBe(expected);
    expect(savedStorage.removeItem).toHaveBeenCalledWith('demo.apiBaseUrl');
  });

  it('ignores both query and stored demo overrides', () => {
    mockWindow('localhost', '?apiBaseUrl=https://demo.ngrok-free.app', 'http://localhost:3001');
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api');
  });

  it('keeps the default when an unsupported saved override is removed', () => {
    const storage = mockWindow('localhost', '', 'https://old.ngrok-free.app');
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api');
    expect(storage.removeItem).toHaveBeenCalledWith('demo.apiBaseUrl');
  });

  it('uses the local base without a browser window', () => {
    vi.stubGlobal('window', undefined);
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api');
  });
});
