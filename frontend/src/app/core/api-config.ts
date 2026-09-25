/** Destinos de API definidos por la aplicación, nunca por navegación o almacenamiento. */
const LOCALHOST_API_BASE_URL = 'http://localhost:3001/api';
const PRODUCTION_API_BASE_URL = 'https://instituto-gestion-demo-api.vercel.app/api';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return LOCALHOST_API_BASE_URL;
  // Retirar también valores legacy antes aceptados. El storage no decide el destino.
  try { window.localStorage.removeItem('demo.apiBaseUrl'); } catch { /* Storage no disponible. */ }
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
    ? LOCALHOST_API_BASE_URL : PRODUCTION_API_BASE_URL;
}

/** Valida el destinatario real antes de agregar credenciales. */
export function isTrustedApiRequest(value: string): boolean {
  try {
    const target = new URL(value);
    const trusted = new URL(getApiBaseUrl());
    return !target.username && !target.password
      && target.protocol === trusted.protocol
      && target.hostname === trusted.hostname
      && target.port === trusted.port
      && (target.pathname === '/api' || target.pathname.startsWith('/api/'));
  } catch {
    return false;
  }
}
