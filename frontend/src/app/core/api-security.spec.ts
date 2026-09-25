import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './api-config';

const hostileApiUrls = [
  'https://attacker.example/api',
  'https://instituto-gestion-demo-api.vercel.app.attacker.example/api',
  'https://instituto-gestion-demo-api-evil.vercel.app/api',
  'https://instituto-gestion-demo-api.vercel.app@attacker.example/api',
  'https://user:password@instituto-gestion-demo-api.vercel.app/api',
  'http://localhost:3001@attacker.example/api',
  'http://localhost:3001/api', 'https://localhost:3001/api',
  'javascript:alert(1)', 'data:text/plain,test', 'file:///api',
  '//attacker.example/api', 'https://attacker.example%2f@evil.example/api',
];

describe('API de destino confiable', () => {
  afterEach(() => vi.unstubAllGlobals());
  function location(hostname: string, override = '') {
    const storage = { removeItem: vi.fn(), getItem: vi.fn(() => override), setItem: vi.fn() };
    vi.stubGlobal('window', { location: { hostname, search: `?apiBaseUrl=${encodeURIComponent(override)}` }, localStorage: storage });
    return storage;
  }
  it.each(hostileApiUrls)('ignora y elimina overrides inseguros: %s', override => {
    const storage = location('instituto.vercel.app', override);
    expect(getApiBaseUrl()).toBe('https://instituto-gestion-demo-api.vercel.app/api');
    expect(storage.removeItem).toHaveBeenCalledWith('demo.apiBaseUrl');
    expect(storage.setItem).not.toHaveBeenCalled();
    location('localhost', override);
    expect(getApiBaseUrl()).toBe('http://localhost:3001/api');
  });
  it('no permite dirigir producción a localhost', () => {
    location('instituto.vercel.app', 'http://localhost:3001/api');
    expect(getApiBaseUrl()).toBe('https://instituto-gestion-demo-api.vercel.app/api');
  });
  it('tolera almacenamiento no disponible sin habilitar el override', () => {
    const storage = location('instituto.vercel.app', 'https://attacker.example');
    storage.removeItem.mockImplementation(() => { throw new Error('Storage disabled'); });
    expect(getApiBaseUrl()).toBe('https://instituto-gestion-demo-api.vercel.app/api');
  });
});
