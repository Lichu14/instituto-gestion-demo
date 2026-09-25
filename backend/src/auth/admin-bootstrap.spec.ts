import { bootstrapConfig, bootstrapAdmin } from '../../prisma/admin-bootstrap';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

describe('Bootstrap sin credenciales predeterminadas', () => {
  it.each([
    {},
    { BOOTSTRAP_ADMIN_PASSWORD: '' },
    {
      BOOTSTRAP_ADMIN_EMAIL: 'test@example.invalid',
      BOOTSTRAP_ADMIN_NOMBRE: 'Test',
      BOOTSTRAP_ADMIN_PASSWORD: 'short',
    },
  ])('rechaza configuración incompleta o insegura', (env) => {
    expect(() => bootstrapConfig(env)).toThrow('BOOTSTRAP_ADMIN_PASSWORD');
  });
  it('el comando sin credenciales falla antes de conectarse y no imprime secretos', () => {
    const result = spawnSync(
      process.execPath,
      [resolve('node_modules/tsx/dist/cli.mjs'), 'prisma/seed-admin.ts'],
      {
        cwd: resolve('.'),
        encoding: 'utf8',
        env: {
          ...process.env,
          DATABASE_URL:
            'postgresql://do-not-print:this-is-secret@invalid.invalid/test',
          BOOTSTRAP_ADMIN_EMAIL: '',
          BOOTSTRAP_ADMIN_NOMBRE: '',
          BOOTSTRAP_ADMIN_PASSWORD: '',
        },
        timeout: 10000,
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No se completó el bootstrap');
    expect(result.stdout + result.stderr).not.toMatch(
      /this-is-secret|passwordHash|invalid\.invalid/,
    );
  });
});
const integration = process.env.TEST_AUTH_DB === '1' ? describe : describe.skip;
integration(
  'Bootstrap: contraseña explícita y conservación en PostgreSQL',
  () => {
    const prisma = new PrismaService();
    beforeAll(async () => {
      if (
        !['localhost', '127.0.0.1'].includes(
          new URL(process.env.DATABASE_URL!).hostname,
        )
      )
        throw new Error('Solo base local');
      await prisma.$connect();
    });
    afterAll(async () => {
      await prisma.$disconnect();
    });
    it('crea, verifica con bcrypt y no reemplaza una contraseña cambiada al repetir el seed', async () => {
      const rollback = new Error('rollback fixture');
      try {
        await prisma.$transaction(
          async (tx) => {
            const config = bootstrapConfig({
              BOOTSTRAP_ADMIN_EMAIL: `${randomUUID()}@example.invalid`,
              BOOTSTRAP_ADMIN_NOMBRE: 'Bootstrap test',
              BOOTSTRAP_ADMIN_PASSWORD: randomUUID(),
            });
            const first = await bootstrapAdmin(tx, config);
            const user = await tx.usuario.findUniqueOrThrow({
              where: { id: first.id },
            });
            expect(
              await bcrypt.compare(config.password, user.passwordHash),
            ).toBe(true);
            const changed = await bcrypt.hash(randomUUID(), 4);
            await tx.usuario.update({
              where: { id: first.id },
              data: { passwordHash: changed, activo: false },
            });
            expect(
              await bootstrapAdmin(tx, { ...config, password: randomUUID() }),
            ).toEqual(first);
            expect(
              await tx.usuario.findUniqueOrThrow({ where: { id: first.id } }),
            ).toMatchObject({ passwordHash: changed, activo: false });
            throw rollback;
          },
          { timeout: 10000 },
        );
      } catch (error) {
        if (error !== rollback) throw error;
      }
    });
  },
);
