import { isIP } from 'node:net';
import type { Request } from 'express';

export function loginClientIp(req: Request): string {
  // Vercel controla este header en su borde. En local no confiamos en headers del cliente.
  const edge =
    process.env.VERCEL === '1'
      ? req.headers['x-vercel-forwarded-for']
      : undefined;
  let ip =
    typeof edge === 'string' && isIP(edge)
      ? edge
      : req.socket.remoteAddress || 'unknown';
  if (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
  return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname : ip;
}
