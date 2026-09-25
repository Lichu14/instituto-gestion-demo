import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { AlumnosModule } from '../alumnos/alumnos.module';
import { PagosModule } from './pagos.module';
import { EmailService } from '../email/email.service';
import type { SendPaymentConfirmationEmailInput } from '../email/email.service';
import { ComprobantePagoService } from './comprobante-pago.service';
import { configureApp } from '../create-app';

// Opt-in: base PostgreSQL local migrada. Cada caso termina con ROLLBACK, sin borrar datos.
const integration =
  process.env.TEST_AUDITORIA_DB === '1' ? describe : describe.skip;
type PagoJson = {
  id: number;
  cuotaId: number;
  monto: string;
  fechaPago: string;
  fechaRegistro: string;
  usuarioRegistroId: number;
  usuarioRegistro: { id: number; nombre: string };
  estado: string;
  eventos: {
    id: number;
    accion: string;
    usuarioId: number;
    usuarioNombre: string;
    anterior: Record<string, unknown> | null;
    nuevo: Record<string, unknown>;
    motivo: string | null;
  }[];
};

integration('Auditoría de pagos con PostgreSQL y JWT reales', () => {
  const prisma = new PrismaService();
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname))
      throw new Error('Estas pruebas solo admiten una base local');
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function escenario(
    work: (context: {
      server: Server;
      token: string;
      usuarioId: number;
      cuotaId: number;
      tx: Prisma.TransactionClient;
      email: jest.Mock;
      failEvent: () => void;
    }) => Promise<void>,
  ) {
    const rollback = new Error('rollback de los datos de prueba');
    try {
      await prisma.$transaction(
        async (tx) => {
          const suffix = randomUUID();
          const usuario = await tx.usuario.create({
            data: {
              nombre: 'Operadora de prueba',
              email: `${suffix}@example.invalid`,
              passwordHash: await bcrypt.hash('test-password', 4),
            },
          });
          const profesora = await tx.profesora.create({
            data: {
              nombre: 'Test',
              apellido: 'Auditoría',
              dni: suffix,
              telefono: '-',
            },
          });
          const curso = await tx.curso.create({
            data: {
              nombre: 'Test auditoría',
              profesoraId: profesora.id,
              precioMensual: 100,
              precioMatricula: 100,
            },
          });
          const alumno = await tx.alumno.create({
            data: {
              nombre: 'Prueba',
              apellido: 'Auditoría',
              dni: suffix,
              telefono: '-',
              fechaNacimiento: new Date('2000-01-01'),
            },
          });
          const inscripcion = await tx.inscripcion.create({
            data: { alumnoId: alumno.id, cursoId: curso.id, año: 2026 },
          });
          const cuota = await tx.cuota.create({
            data: {
              inscripcionId: inscripcion.id,
              periodo: 'Octubre',
              concepto: 'MENSUALIDAD',
              monto: 100,
              fechaVencimiento: new Date('2099-10-10'),
            },
          });
          const email = jest.fn();
          let rejectEvent = false;
          const eventDelegate = {
            ...tx.pagoEvento,
            create: (args: Prisma.PagoEventoCreateArgs) => {
              if (rejectEvent) {
                rejectEvent = false;
                throw new Error('Fallo de auditoría simulado');
              }
              return tx.pagoEvento.create(args);
            },
          };
          // SAVEPOINT permite comprobar también el rollback del servicio sin dejar fixtures persistentes.
          const prismaTest = {
            alumno: tx.alumno,
            usuario: tx.usuario,
            pago: tx.pago,
            cuota: tx.cuota,
            pagoEvento: tx.pagoEvento,
            $transaction: async (
              fn: (client: Prisma.TransactionClient) => Promise<unknown>,
            ) => {
              await tx.$executeRaw`SAVEPOINT auditoria_servicio`;
              try {
                const result = await fn({
                  ...tx,
                  $executeRaw: tx.$executeRaw.bind(
                    tx,
                  ) as Prisma.TransactionClient['$executeRaw'],
                  $queryRaw: tx.$queryRaw.bind(
                    tx,
                  ) as Prisma.TransactionClient['$queryRaw'],
                  pagoEvento: eventDelegate,
                } as Prisma.TransactionClient);
                await tx.$executeRaw`RELEASE SAVEPOINT auditoria_servicio`;
                return result;
              } catch (error) {
                await tx.$executeRaw`ROLLBACK TO SAVEPOINT auditoria_servicio`;
                throw error;
              }
            },
          };
          const module = await Test.createTestingModule({
            imports: [PagosModule, AlumnosModule, AuthModule],
          })
            .overrideProvider(PrismaService)
            .useValue(prismaTest)
            .overrideProvider(EmailService)
            .useValue({ sendPaymentConfirmation: email })
            .compile();
          const app: INestApplication = module.createNestApplication();
          app.useLogger(false);
          configureApp(app);
          await app.init();
          try {
            const server = app.getHttpServer() as Server;
            const login = await request(server)
              .post('/api/auth/login')
              .send({ email: usuario.email, password: 'test-password' })
              .expect(200);
            const token = (login.body as { access_token: string }).access_token;
            await work({
              server,
              token,
              usuarioId: usuario.id,
              cuotaId: cuota.id,
              tx,
              email,
              failEvent: () => {
                rejectEvent = true;
              },
            });
          } finally {
            await app.close();
          }
          throw rollback;
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
  }

  it('rechaza identidad/timestamps falsificados, sesiones inválidas y usuarios inactivos', async () => {
    await escenario(async ({ server, token, usuarioId, cuotaId, tx }) => {
      const body = {
        cuotaId,
        monto: 25,
        medio: 'EFECTIVO',
        nombrePagador: 'Familia',
      };
      await request(server).post('/api/pagos').send(body).expect(401);
      await request(server)
        .post('/api/pagos')
        .set('Authorization', 'Bearer inválido')
        .send(body)
        .expect(401);
      for (const fields of [
        { usuarioRegistroId: usuarioId },
        { usuarioRegistro: { id: usuarioId } },
        { fechaRegistro: '2000-01-01' },
        { eventos: [] },
        { nombrePagador: '   ' },
        { fechaPago: '2026-09-23T15:00:00' },
      ]) {
        await request(server)
          .post('/api/pagos')
          .set('Authorization', `Bearer ${token}`)
          .send({ ...body, ...fields })
          .expect(400);
      }
      expect(await tx.pago.count({ where: { cuotaId } })).toBe(0);
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { activo: false },
      });
      await request(server)
        .post('/api/pagos')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(401);
    });
  });

  it('revoca lecturas, escritura y ambos PDF al desactivar al usuario; también rechaza JWT vencido/eliminado', async () => {
    await escenario(async ({ server, token, usuarioId, cuotaId, tx }) => {
      const cuota = await tx.cuota.findUniqueOrThrow({
        where: { id: cuotaId },
        include: { inscripcion: true },
      });
      const payment = await tx.pago.create({
        data: { cuotaId, monto: 1, medio: 'EFECTIVO' },
      });
      const paths = [
        '/api/pagos',
        `/api/pagos/${payment.id}`,
        '/api/alumnos',
        `/api/alumnos/${cuota.inscripcion.alumnoId}/estado-cuenta.pdf`,
        `/api/pagos/${payment.id}/comprobante.pdf`,
      ];
      for (const path of paths)
        await request(server)
          .get(path)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      const expired = await new JwtService({
        secret: process.env.JWT_SECRET,
      }).signAsync({ sub: usuarioId }, { expiresIn: -1 });
      for (const path of paths)
        await request(server)
          .get(path)
          .set('Authorization', `Bearer ${expired}`)
          .expect(401);
      const before = await tx.pago.count({ where: { cuotaId } });
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { activo: false },
      });
      for (const path of paths)
        await request(server)
          .get(path)
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      await request(server)
        .post('/api/pagos')
        .set('Authorization', `Bearer ${token}`)
        .send({ cuotaId, monto: 1, medio: 'EFECTIVO', nombrePagador: 'Test' })
        .expect(401);
      await request(server)
        .patch(`/api/pagos/${payment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ medio: 'TRANSFERENCIA' })
        .expect(401);
      expect(await tx.pago.count({ where: { cuotaId } })).toBe(before);
      const user = await tx.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
      });
      await request(server)
        .post('/api/auth/login')
        .send({ email: user.email, password: 'test-password' })
        .expect(401);
      await tx.usuario.delete({ where: { id: usuarioId } });
      for (const path of paths)
        await request(server)
          .get(path)
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
    });
  });

  it('registra creación, modificación y anulación sin reemplazar el historial ni el autor original', async () => {
    await escenario(
      async ({ server, token, usuarioId, cuotaId, tx, email }) => {
        const auth = `Bearer ${token}`;
        const start = Date.now();
        const created = await request(server)
          .post('/api/pagos')
          .set('Authorization', auth)
          .send({
            cuotaId,
            monto: 25.5,
            medio: 'EFECTIVO',
            nombrePagador: 'Familia Pérez',
            fechaPago: '2026-01-05T13:45:00Z',
          })
          .expect(201);
        const pago = created.body as PagoJson;
        expect(pago.usuarioRegistro).toEqual({
          id: usuarioId,
          nombre: 'Operadora de prueba',
        });
        expect(pago.fechaPago).toBe('2026-01-05T13:45:00.000Z');
        expect(new Date(pago.fechaRegistro).getTime()).toBeGreaterThan(
          start - 30000,
        );
        expect(new Date(pago.fechaRegistro).getTime()).toBeLessThanOrEqual(
          Date.now(),
        );
        expect(email).not.toHaveBeenCalled();
        const path = `/api/pagos/${pago.id}`;
        const original = (
          await request(server).get(path).set('Authorization', auth).expect(200)
        ).body as PagoJson;
        expect(original.eventos.map((e) => e.accion)).toEqual(['CREADO']);
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { nombre: 'Nombre actualizado' },
        });
        const otroUsuario = await tx.usuario.create({
          data: {
            nombre: 'Segunda operadora',
            email: `${randomUUID()}@example.invalid`,
            passwordHash: await bcrypt.hash('test-password', 4),
          },
        });
        const otroLogin = await request(server)
          .post('/api/auth/login')
          .send({ email: otroUsuario.email, password: 'test-password' })
          .expect(200);
        const otroAuth = `Bearer ${(otroLogin.body as { access_token: string }).access_token}`;
        await request(server)
          .patch(path)
          .set('Authorization', otroAuth)
          .send({ medio: 'TRANSFERENCIA', nombrePagador: 'Familia Gómez' })
          .expect(200);
        await request(server)
          .patch(path)
          .set('Authorization', auth)
          .send({ medio: 'TRANSFERENCIA' })
          .expect(200);
        for (const field of [
          { monto: 999 },
          { cuotaId: 999 },
          { estado: 'ANULADO' },
          { usuarioRegistroId: 999 },
          { fechaRegistro: '2000-01-01' },
        ]) {
          await request(server)
            .patch(path)
            .set('Authorization', auth)
            .send(field)
            .expect(400);
        }
        await request(server)
          .patch(`${path}/anular`)
          .set('Authorization', auth)
          .send({ motivo: 'Carga de prueba' })
          .expect(200);
        await request(server)
          .patch(`${path}/anular`)
          .set('Authorization', auth)
          .send({ motivo: 'Reintento' })
          .expect(200);
        const final = (
          await request(server).get(path).set('Authorization', auth).expect(200)
        ).body as PagoJson;
        expect(final.fechaRegistro).toBe(pago.fechaRegistro);
        expect(final.usuarioRegistroId).toBe(usuarioId);
        expect(final.eventos.map((e) => e.accion)).toEqual([
          'CREADO',
          'MODIFICADO',
          'ANULADO',
        ]);
        expect(final.eventos[0]).toEqual(original.eventos[0]);
        expect(final.eventos[0].usuarioNombre).toBe('Operadora de prueba');
        expect(final.eventos[1].usuarioNombre).toBe('Segunda operadora');
        expect(final.eventos[1].usuarioId).toBe(otroUsuario.id);
        expect(final.eventos[2].usuarioId).toBe(usuarioId);
        expect(final.eventos[2].usuarioNombre).toBe('Nombre actualizado');
        expect(final.eventos[1].anterior?.nombrePagador).toBe('Familia Pérez');
        expect(final.eventos[1].nuevo.nombrePagador).toBe('Familia Gómez');
        expect(
          (await tx.cuota.findUniqueOrThrow({ where: { id: cuotaId } })).estado,
        ).toBe('PENDIENTE');
        await request(server)
          .patch(path)
          .set('Authorization', auth)
          .send({ medio: 'EFECTIVO' })
          .expect(409);
        // El importe anulado ya no bloquea un nuevo pago por el saldo total.
        await request(server)
          .post('/api/pagos')
          .set('Authorization', auth)
          .send({
            cuotaId,
            monto: 100,
            medio: 'EFECTIVO',
            nombrePagador: 'Familia',
          })
          .expect(201);
        await request(server)
          .post('/api/pagos')
          .set('Authorization', auth)
          .send({
            cuotaId,
            monto: 1,
            medio: 'EFECTIVO',
            nombrePagador: 'Familia',
          })
          .expect(409);
      },
    );
  });

  it('revierte el pago si falla el evento y mantiene operables los registros históricos', async () => {
    await escenario(async ({ server, token, cuotaId, tx, failEvent }) => {
      failEvent();
      await request(server)
        .post('/api/pagos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cuotaId,
          monto: 25,
          medio: 'EFECTIVO',
          nombrePagador: 'Familia',
        })
        .expect(500);
      expect(await tx.pago.count({ where: { cuotaId } })).toBe(0);
      expect(
        (await tx.cuota.findUniqueOrThrow({ where: { id: cuotaId } })).estado,
      ).toBe('PENDIENTE');
      const historic = await tx.pago.create({
        data: {
          cuotaId,
          monto: 1,
          medio: 'EFECTIVO',
          usuarioRegistroId: null,
          fechaRegistro: null,
        },
      });
      const detail = (
        await request(server)
          .get(`/api/pagos/${historic.id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as PagoJson;
      expect(detail.usuarioRegistro).toBeNull();
      expect(detail.fechaRegistro).toBeNull();
      expect(detail.eventos).toEqual([]);
      const list = await request(server)
        .get('/api/pagos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(JSON.stringify(list.body)).not.toContain('passwordHash');
    });
  });

  it('descarga exactamente el PDF adjunto y mantiene la operación de lectura protegida', async () => {
    await escenario(async ({ server, token, cuotaId, tx, email }) => {
      const cuota = await tx.cuota.findUniqueOrThrow({
        where: { id: cuotaId },
        include: { inscripcion: true },
      });
      await tx.alumno.update({
        where: { id: cuota.inscripcion.alumnoId },
        data: { email: 'test@example.invalid' },
      });
      const auth = `Bearer ${token}`;
      const created = await request(server)
        .post('/api/pagos')
        .set('Authorization', auth)
        .send({
          cuotaId,
          monto: 25,
          medio: 'EFECTIVO',
          nombrePagador: 'Familia',
          fechaPago: '2026-09-20T15:30:00Z',
        })
        .expect(201);
      const pago = created.body as PagoJson;
      expect(email).toHaveBeenCalledTimes(1);
      const [input] = email.mock.calls[0] as [
        SendPaymentConfirmationEmailInput,
      ];
      const before = await tx.pago.findUniqueOrThrow({
        where: { id: pago.id },
      });
      const path = `/api/pagos/${pago.id}/comprobante.pdf`;
      await request(server).get(path).expect(401);
      await request(server)
        .get('/api/pagos/2147483647/comprobante.pdf')
        .set('Authorization', auth)
        .expect(404);
      await request(server)
        .get('/api/pagos/invalido/comprobante.pdf')
        .set('Authorization', auth)
        .expect(400);
      const pdf = await request(server)
        .get(path)
        .set('Authorization', auth)
        .expect(200)
        .expect('Content-Type', /application\/pdf/);
      expect(pdf.headers['content-disposition']).toContain(
        input.comprobante.filename,
      );
      expect(pdf.headers['access-control-expose-headers']).toBe(
        'Content-Disposition',
      );
      expect(pdf.headers['cache-control']).toBe('private, no-store');
      expect(
        Buffer.from(pdf.body as Uint8Array).equals(input.comprobante.buffer),
      ).toBe(true);
      expect(
        await tx.pago.findUniqueOrThrow({ where: { id: pago.id } }),
      ).toEqual(before);
      expect(await tx.pago.count({ where: { cuotaId } })).toBe(1);
      expect(await tx.pagoEvento.count({ where: { pagoId: pago.id } })).toBe(1);
      expect(email).toHaveBeenCalledTimes(1);
    });
  });

  it('conserva un único pago si falla el email y no envía nada cuando falla el registro', async () => {
    await escenario(
      async ({ server, token, cuotaId, tx, email, failEvent }) => {
        const cuota = await tx.cuota.findUniqueOrThrow({
          where: { id: cuotaId },
          include: { inscripcion: true },
        });
        await tx.alumno.update({
          where: { id: cuota.inscripcion.alumnoId },
          data: { email: 'test@example.invalid' },
        });
        const send = () =>
          request(server)
            .post('/api/pagos')
            .set('Authorization', `Bearer ${token}`)
            .send({
              cuotaId,
              monto: 25,
              medio: 'EFECTIVO',
              nombrePagador: 'Familia',
            });
        failEvent();
        await send().expect(500);
        expect(email).not.toHaveBeenCalled();
        expect(await tx.pago.count({ where: { cuotaId } })).toBe(0);
        email.mockRejectedValue(new Error('Resend no disponible'));
        await send().expect(201);
        expect(email).toHaveBeenCalledTimes(1);
        expect(await tx.pago.count({ where: { cuotaId } })).toBe(1);
        expect(
          (await tx.cuota.findUniqueOrThrow({ where: { id: cuotaId } })).estado,
        ).toBe('PAGO_PARCIAL');
      },
    );
  });

  it('no duplica ni revierte el pago si falla exclusivamente el generador PDF', async () => {
    await escenario(async ({ server, token, cuotaId, tx, email }) => {
      const cuota = await tx.cuota.findUniqueOrThrow({
        where: { id: cuotaId },
        include: { inscripcion: true },
      });
      await tx.alumno.update({
        where: { id: cuota.inscripcion.alumnoId },
        data: { email: 'test@example.invalid' },
      });
      const generate = jest
        .spyOn(ComprobantePagoService.prototype, 'generar')
        .mockRejectedValueOnce(new Error('Fallo PDF simulado'));
      try {
        const created = await request(server)
          .post('/api/pagos')
          .set('Authorization', `Bearer ${token}`)
          .send({
            cuotaId,
            monto: 25,
            medio: 'EFECTIVO',
            nombrePagador: 'Familia',
          })
          .expect(201);
        const pago = created.body as PagoJson;
        expect(await tx.pago.count({ where: { cuotaId } })).toBe(1);
        expect(await tx.pagoEvento.count({ where: { pagoId: pago.id } })).toBe(
          1,
        );
        expect(email).not.toHaveBeenCalled();
        await request(server)
          .get(`/api/pagos/${pago.id}/comprobante.pdf`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      } finally {
        generate.mockRestore();
      }
    });
  });

  it.each(['UPDATE', 'DELETE'])(
    'impide %s de eventos existentes en la base',
    async (operation) => {
      await escenario(async ({ server, token, cuotaId, tx }) => {
        const res = await request(server)
          .post('/api/pagos')
          .set('Authorization', `Bearer ${token}`)
          .send({
            cuotaId,
            monto: 10,
            medio: 'EFECTIVO',
            nombrePagador: 'Familia',
          })
          .expect(201);
        const pago = res.body as PagoJson;
        await tx.$executeRaw`SAVEPOINT intento_historial`;
        const change =
          operation === 'UPDATE'
            ? tx.$executeRaw`UPDATE pago_eventos SET motivo = 'Sobrescribir' WHERE "pagoId" = ${pago.id}`
            : tx.$executeRaw`DELETE FROM pago_eventos WHERE "pagoId" = ${pago.id}`;
        await expect(change).rejects.toThrow('inmutable');
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT intento_historial`;
        expect(await tx.pagoEvento.count({ where: { pagoId: pago.id } })).toBe(
          1,
        );
      });
    },
  );
});
