import type { Request } from 'express';
import { loginClientIp } from './login-client-ip';
describe('IP de login', () => {
  const original = process.env.VERCEL;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  });
  const req = (edge: unknown, socket = '::ffff:127.0.0.1') =>
    ({
      headers: {
        'x-vercel-forwarded-for': edge,
        'x-forwarded-for': '203.0.113.8',
      },
      socket: { remoteAddress: socket },
    }) as Request;
  it('ignora headers del cliente fuera de Vercel', () => {
    delete process.env.VERCEL;
    expect(loginClientIp(req('203.0.113.99'))).toBe('127.0.0.1');
  });
  it('valida el header controlado por Vercel y canonicaliza IPv6', () => {
    process.env.VERCEL = '1';
    expect(loginClientIp(req('203.0.113.99'))).toBe('203.0.113.99');
    expect(loginClientIp(req('fake'))).toBe('127.0.0.1');
    expect(loginClientIp(req(['203.0.113.99']))).toBe('127.0.0.1');
    expect(loginClientIp(req('2001:db8:0:0::1'))).toBe(
      loginClientIp(req('2001:db8::1')),
    );
  });
});
