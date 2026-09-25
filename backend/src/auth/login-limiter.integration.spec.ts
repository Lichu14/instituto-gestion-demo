import { randomUUID, createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';
import {
  LoginLimiterService,
  LoginLimitException,
} from './login-limiter.service';
import { configureApp } from '../create-app';

const integration = process.env.TEST_AUTH_DB === '1' ? describe : describe.skip;
integration('Límite de login compartido con PostgreSQL', () => {
  const clients = [new PrismaService(), new PrismaService()];
  const limiters = clients.map((p) => new LoginLimiterService(p));
  const keys = new Set<string>();
  let app: INestApplication;
  let server: Server;
  let usuarioId: number;
  const email = `${randomUUID()}@example.invalid`;
  function track(account: string, ip: string) {
    for (const v of [`cuenta:${account.trim().toLowerCase()}`, `ip:${ip}`])
      keys.add(
        createHmac('sha256', process.env.JWT_SECRET!).update(v).digest('hex'),
      );
  }
  beforeAll(async () => {
    if (
      !['localhost', '127.0.0.1'].includes(
        new URL(process.env.DATABASE_URL!).hostname,
      )
    )
      throw new Error('Solo base local');
    await Promise.all(clients.map((p) => p.$connect()));
    usuarioId = (
      await clients[0].usuario.create({
        data: {
          nombre: 'Test límite',
          email,
          passwordHash: await bcrypt.hash('test-only-password', 4),
        },
      })
    ).id;
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(PrismaService)
      .useValue(clients[0])
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
  });
  afterAll(async () => {
    await app?.close();
    if (usuarioId)
      await clients[0].usuario.delete({ where: { id: usuarioId } });
    await clients[0].loginIntento.deleteMany({
      where: { clave: { in: [...keys] } },
    });
    await Promise.all(clients.map((p) => p.$disconnect()));
  });
  it('reserva atómicamente entre instancias aunque roten IP y mayúsculas', async () => {
    const account = `${randomUUID()}@example.invalid`;
    const calls = Array.from({ length: 12 }, (_, i) => {
      const ip = `test-${randomUUID()}`;
      track(account, ip);
      return limiters[i % 2].reservar(
        i % 2 ? account.toUpperCase() : ` ${account} `,
        ip,
      );
    });
    const results = await Promise.allSettled(calls);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
    for (const result of results.filter((r) => r.status === 'rejected'))
      expect(result.reason).toBeInstanceOf(LoginLimitException);
    track(account, 'restart-test');
    await expect(
      new LoginLimiterService(clients[1]).reservar(account, 'restart-test'),
    ).rejects.toBeInstanceOf(LoginLimitException);
  });
  it('limita IP con cuentas diferentes y recupera sin extender el bloqueo', async () => {
    const ip = `test-${randomUUID()}`;
    const accounts = Array.from(
      { length: 31 },
      () => `${randomUUID()}@example.invalid`,
    );
    for (const account of accounts) track(account, ip);
    for (const account of accounts.slice(0, 30))
      await limiters[0].reservar(account, ip);
    const before = await clients[0].loginIntento.findMany({
      where: { clave: { in: [...keys] } },
      orderBy: { clave: 'asc' },
    });
    await expect(limiters[1].reservar(accounts[30], ip)).rejects.toBeInstanceOf(
      LoginLimitException,
    );
    expect(
      await clients[0].loginIntento.findMany({
        where: { clave: { in: [...keys] } },
        orderBy: { clave: 'asc' },
      }),
    ).toEqual(before);
    await clients[0].loginIntento.updateMany({
      where: { clave: { in: [...keys] } },
      data: { expira: new Date(0) },
    });
    await expect(limiters[1].reservar(accounts[30], ip)).resolves.toHaveLength(
      2,
    );
  });
  it('un éxito no borra fallos concurrentes ni descuenta de una ventana posterior', async () => {
    const account = `${randomUUID()}@example.invalid`;
    const ip = `test-${randomUUID()}`;
    track(account, ip);
    const success = await limiters[0].reservar(account, ip);
    await limiters[1].reservar(account, ip); // Un intento fallido concurrente.
    await limiters[0].confirmarExito(success);
    const where = { clave: { in: success.map((r) => r.clave) } };
    expect(
      (await clients[0].loginIntento.findMany({ where })).map(
        (r) => r.intentos,
      ),
    ).toEqual([1, 1]);
    await clients[0].loginIntento.updateMany({
      where,
      data: { expira: new Date(0) },
    });
    await limiters[1].reservar(account, ip);
    await limiters[0].confirmarExito(success); // Éxito tardío de la ventana anterior.
    expect(
      (await clients[0].loginIntento.findMany({ where })).map(
        (r) => r.intentos,
      ),
    ).toEqual([1, 1]);
  });

  it('HTTP: éxito, fallos genéricos, 429 con Retry-After y recuperación', async () => {
    track(email, '127.0.0.1');
    const login = (password: string) =>
      request(server)
        .post('/api/auth/login')
        .set('X-Forwarded-For', randomUUID())
        .set('X-Vercel-Forwarded-For', '203.0.113.99')
        .send({ email, password });
    await login('test-only-password').expect(200);
    const unknown = `${randomUUID()}@example.invalid`;
    track(unknown, '127.0.0.1');
    const missing = await request(server)
      .post('/api/auth/login')
      .send({ email: unknown, password: 'incorrecta' })
      .expect(401);
    expect((missing.body as { message: string }).message).toBe(
      'Credenciales invalidas',
    );
    for (let i = 0; i < 5; i++) {
      const response = await login('incorrecta').expect(401);
      expect((response.body as { message: string }).message).toBe(
        'Credenciales invalidas',
      );
    }
    const blocked = await login('test-only-password').expect(429);
    expect(blocked.headers['retry-after']).toBe('900');
    expect(JSON.stringify(blocked.body)).not.toMatch(
      /passwordHash|postgres|prisma/i,
    );
    await clients[0].loginIntento.updateMany({
      where: { clave: { in: [...keys] } },
      data: { expira: new Date(0) },
    });
    await login('test-only-password').expect(200);
  });
});
