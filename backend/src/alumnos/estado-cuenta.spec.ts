import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PDFDocument } from 'pdf-lib';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { LoginLimiterService } from '../auth/login-limiter.service';
import { AlumnosModule } from './alumnos.module';
import { AlumnosService } from './alumnos.service';
import { generarEstadoCuentaPdf } from './estado-cuenta.pdf';
import { proyectarCuota, resumirCuotas } from './estado-cuenta.util';
import { configureApp } from '../create-app';
import type { Server } from 'node:http';

const D = (value: string | number) => new Prisma.Decimal(value);
const hoy = new Date('2026-09-23T15:00:00Z');
const cuota = {
  id: 1,
  inscripcionId: 1,
  periodo: 'Septiembre',
  concepto: 'MENSUALIDAD' as const,
  monto: D('100.30'),
  estado: 'PAGO_PARCIAL' as const,
  fechaVencimiento: new Date('2026-09-10T00:00:00Z'),
  pagos: [
    {
      id: 1,
      cuotaId: 1,
      monto: D('20.10'),
      estado: 'CONFIRMADO' as const,
      medio: 'EFECTIVO' as const,
      fechaPago: hoy,
      nombrePagador: null,
      observaciones: null,
    },
    {
      id: 2,
      cuotaId: 1,
      monto: D('70'),
      estado: 'ANULADO' as const,
      medio: 'TRANSFERENCIA' as const,
      fechaPago: hoy,
      nombrePagador: null,
      observaciones: null,
    },
  ],
};
const alumno = {
  id: 1,
  nombre: 'María',
  apellido: 'Muñoz',
  dni: '12345678',
  telefono: '',
  email: null,
  fechaNacimiento: hoy,
  fechaAlta: hoy,
  estado: 'ACTIVO',
  inscripciones: [
    {
      id: 1,
      alumnoId: 1,
      cursoId: 1,
      año: 2026,
      fechaInscripcion: hoy,
      descuentoPorcentaje: D(0),
      estado: 'ACTIVA',
      curso: { id: 1, nombre: 'Inglés · Nivel inicial' },
      cuotas: [cuota],
    },
  ],
};

describe('Estado de cuenta: reglas de lectura', () => {
  it('conserva centavos y excluye pagos anulados sin mutar la cuota', () => {
    const result = proyectarCuota(cuota, hoy);
    expect(result).toMatchObject({
      totalAbonado: '20.10',
      saldo: '80.20',
      estado: 'VENCIDA',
    });
    expect(cuota.estado).toBe('PAGO_PARCIAL');
    expect(cuota.pagos).toHaveLength(2);
  });

  it('vence al día siguiente en Argentina, independientemente de la zona del servidor', () => {
    expect(proyectarCuota(cuota, new Date('2026-09-11T02:59:59Z')).estado).toBe(
      'PAGO_PARCIAL',
    );
    expect(proyectarCuota(cuota, new Date('2026-09-11T03:00:00Z')).estado).toBe(
      'VENCIDA',
    );
  });

  it('incluye cuotas futuras y excluye pagadas/anuladas de la deuda, conservando pagos confirmados', () => {
    const vencida = proyectarCuota(cuota, hoy);
    const futura = proyectarCuota(
      { ...cuota, pagos: [], fechaVencimiento: new Date('2026-10-10') },
      hoy,
    );
    const anulada = proyectarCuota(
      { ...cuota, estado: 'ANULADA' as const },
      hoy,
    );
    const pagada = proyectarCuota(
      { ...cuota, estado: 'PAGADA' as const, pagos: [] },
      hoy,
    );
    expect(resumirCuotas([vencida, futura, anulada, pagada])).toEqual({
      abonado: '40.20',
      pendiente: '180.50',
      vencido: '80.20',
    });
    expect(pagada.saldo).toBe('100.30'); // No se reescriben estados manuales ni históricos.
    expect(pagada.estado).toBe('PAGADA');
    expect(resumirCuotas([])).toEqual({
      abonado: '0.00',
      pendiente: '0.00',
      vencido: '0.00',
    });
  });
});

describe('Estado de cuenta: HTTP y autenticación', () => {
  let app: INestApplication;
  let server: Server;
  let token: string;
  const prisma = {
    alumno: { findUnique: jest.fn(), findMany: jest.fn() },
    usuario: { findUnique: jest.fn() },
    cuota: { update: jest.fn(), updateMany: jest.fn() },
    pago: { create: jest.fn() },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AlumnosModule, AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(LoginLimiterService)
      .useValue({
        reservar: jest.fn().mockResolvedValue([]),
        confirmarExito: jest.fn(),
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer() as Server;
    prisma.usuario.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.invalid',
      rol: 'ADMIN',
      activo: true,
      passwordHash: await bcrypt.hash('test-only-password', 4),
    });
    const result = await request(server)
      .post('/api/auth/login')
      .send({ email: 'test@example.invalid', password: 'test-only-password' })
      .expect(200);
    token = (result.body as { access_token: string }).access_token;
    expect(token).toBeTruthy();
  });

  beforeEach(() => {
    prisma.alumno.findUnique.mockResolvedValue(alumno);
    prisma.alumno.findMany.mockResolvedValue([alumno]);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('mantiene login incorrecto en 401 y protege las descargas', async () => {
    await request(server)
      .post('/api/auth/login')
      .send({ email: 'test@example.invalid', password: 'wrong' })
      .expect(401);
    await request(server).get('/api/alumnos/1/estado-cuenta.pdf').expect(401);
    await request(server)
      .get('/api/alumnos/1/estado-cuenta.pdf')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
  });

  it('preserva listados y detalles existentes, agregando los saldos calculados', async () => {
    await request(server)
      .get('/api/alumnos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const response = await request(server)
      .get('/api/alumnos/1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const detail = response.body as {
      inscripciones: { cuotas: { pagos: unknown[] }[] }[];
    };
    expect(detail.inscripciones[0].cuotas[0]).toMatchObject({
      monto: '100.3',
      saldo: '80.20',
      totalAbonado: '20.10',
    });
    expect(detail.inscripciones[0].cuotas[0].pagos).toHaveLength(2);
  });

  it('entrega un PDF autenticado con cabeceras de descarga y sin operaciones de escritura', async () => {
    const before = JSON.stringify(alumno);
    const response = await request(server)
      .get('/api/alumnos/1/estado-cuenta.pdf')
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'http://localhost:4201')
      .expect(200)
      .expect('Content-Type', /application\/pdf/)
      .expect(
        'Content-Disposition',
        'attachment; filename="estado-cuenta-alumno-1.pdf"',
      )
      .expect('Cache-Control', 'private, no-store')
      .expect('Access-Control-Allow-Origin', 'http://localhost:4201');
    const bytes = response.body as Buffer;
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0);
    expect(JSON.stringify(alumno)).toBe(before);
    expect(prisma.cuota.update).not.toHaveBeenCalled();
    expect(prisma.cuota.updateMany).not.toHaveBeenCalled();
    expect(prisma.pago.create).not.toHaveBeenCalled();
  });

  it('devuelve 400 para un identificador inválido y 404 para un alumno inexistente', async () => {
    await request(server)
      .get('/api/alumnos/incorrecto/estado-cuenta.pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    prisma.alumno.findUnique.mockResolvedValueOnce(null);
    await request(server)
      .get('/api/alumnos/999/estado-cuenta.pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('genera varias páginas con nombres largos y también un alumno sin inscripciones', async () => {
    const service = app.get(AlumnosService);
    const data = (await service.findOne(1, hoy))!;
    data.nombre = 'María de los Ángeles '.repeat(8);
    data.inscripciones[0].cuotas = Array.from({ length: 80 }, (_, index) => ({
      ...data.inscripciones[0].cuotas[0],
      id: index + 1,
    }));
    const pdf = await generarEstadoCuentaPdf(data, hoy, 'Instituto Gestión');
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(4);
    data.inscripciones = [];
    expect(
      (
        await PDFDocument.load(
          await generarEstadoCuentaPdf(data, hoy, 'Instituto Gestión'),
        )
      ).getPageCount(),
    ).toBe(1);
  });
});

