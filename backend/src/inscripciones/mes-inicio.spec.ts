import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import request from 'supertest';
import { CreateInscripcionDto } from '../dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from '../dto/update-inscripcion.dto';
import { demoReadonly } from '../demo-readonly';
import { PrismaService } from '../prisma/prisma.service';
import { InscripcionesService } from './inscripciones.service';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validateCreate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: CreateInscripcionDto });

describe('Mes de inicio: contrato de la demo', () => {
  it.each([null, '', 'julio', '7', 7.5, 0, 1, 2, 13, true, [], {}])(
    'rechaza %j sin llegar al servicio',
    async (mesInicio) => {
      await expect(
        validateCreate({ alumnoId: 1, cursoId: 1, año: 2026, mesInicio }),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
  it('acepta julio y conserva la omisión para clientes anteriores', async () => {
    expect(
      (
        await validateCreate({
          alumnoId: 1,
          cursoId: 1,
          año: 2026,
          mesInicio: 7,
        })
      ).mesInicio,
    ).toBe(7);
    expect(
      (await validateCreate({ alumnoId: 1, cursoId: 1, año: 2026 })).mesInicio,
    ).toBeUndefined();
  });
  it('no incorpora mesInicio al contrato de actualización', async () => {
    await expect(
      pipe.transform(
        { mesInicio: 7 },
        { type: 'body', metatype: UpdateInscripcionDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('el alta sigue bloqueada por el modo público de solo lectura', async () => {
    const reached = jest.fn();
    const app = express();
    app.use(demoReadonly);
    app.post('/api/inscripciones', (_req, res) => {
      reached();
      res.sendStatus(201);
    });
    const result = await request(app)
      .post('/api/inscripciones')
      .send({ alumnoId: 1, cursoId: 1, año: 2026, mesInicio: 7 })
      .expect(403);
    expect(result.body.error).toBe('DemoReadOnly');
    expect(reached).not.toHaveBeenCalled();
  });
});

const integration =
  process.env.TEST_DEMO_MES_DB === '1' ? describe : describe.skip;
integration(
  'Generación de la demo: servicio real y PostgreSQL local aislado',
  () => {
    let db: PrismaService;
    let service: InscripcionesService;
    let cursoId: number;
    let historicalId: number;
    let snapshot: string;
    let index = 0;
    const meses = [
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const newAlumno = () =>
      db.alumno.create({
        data: {
          nombre: 'Alumno ficticio',
          apellido: `Mes ${++index}`,
          dni: `8000${String(index).padStart(4, '0')}`,
          telefono: '-',
          fechaNacimiento: new Date('2000-01-01'),
          email: `mes-${index}@example.invalid`,
        },
      });
    const count = async () => [
      await db.inscripcion.count(),
      await db.cuota.count(),
    ];
    const history = async () =>
      JSON.stringify(
        await db.inscripcion.findUnique({
          where: { id: historicalId },
          include: { cuotas: { include: { pagos: true } } },
        }),
      );
    beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL!);
      if (
        url.hostname !== '127.0.0.1' ||
        url.port !== '55441' ||
        !/^\/gestia_demo_mes_test_[a-f0-9]{32}$/.test(url.pathname)
      ) {
        throw new Error(
          'Solo bases ficticias creadas por test/run-mes-inicio.cjs',
        );
      }
      db = new PrismaService();
      await db.$connect();
      service = new InscripcionesService(db);
      const profesora = await db.profesora.create({
        data: {
          nombre: 'Profesora',
          apellido: 'Ficticia',
          dni: '99000001',
          telefono: '-',
        },
      });
      cursoId = (
        await db.curso.create({
          data: {
            nombre: 'Curso ficticio',
            profesoraId: profesora.id,
            precioMensual: 100,
            precioMatricula: 200,
          },
        })
      ).id;
      historicalId = (
        await db.inscripcion.create({
          data: {
            alumnoId: (await newAlumno()).id,
            cursoId,
            año: 2025,
            cuotas: {
              create: {
                periodo: 'Octubre',
                concepto: 'MENSUALIDAD',
                monto: 100.3,
                fechaVencimiento: new Date('2025-10-10'),
                pagos: { create: { monto: 20.1, medio: 'EFECTIVO' } },
              },
            },
          },
        })
      ).id;
      snapshot = await history();
    });
    afterAll(async () => {
      await db?.$disconnect();
    });

    it.each([
      { mes: 3, año: 2026, descuento: 0 },
      { mes: 7, año: 2026, descuento: 15 },
      { mes: 12, año: 2026, descuento: 100 },
      { mes: 7, año: 2031, descuento: 10 },
      { mes: undefined, año: 2026, descuento: 0 },
    ])(
      'mes $mes, año $año y descuento $descuento',
      async ({ mes, año, descuento }) => {
        const body = await validateCreate({
          alumnoId: (await newAlumno()).id,
          cursoId,
          año,
          descuentoPorcentaje: descuento,
          ...(mes === undefined ? {} : { mesInicio: mes }),
        });
        const result = await service.create(body);
        const cuotas = await db.cuota.findMany({
          where: { inscripcionId: result.id },
          orderBy: { fechaVencimiento: 'asc' },
        });
        const inicio = mes === undefined ? 3 : mes;
        const mensualidades = cuotas.filter(
          (c) => c.concepto === 'MENSUALIDAD',
        );
        expect(mensualidades.map((c) => c.periodo)).toEqual(
          meses.slice(inicio - 3),
        );
        expect(mensualidades).toHaveLength(13 - inicio);
        mensualidades.forEach((c, i) => {
          expect(Number(c.monto)).toBe(100 * (1 - descuento / 100));
          expect(c.estado).toBe('PENDIENTE');
          expect(c.fechaVencimiento.toISOString()).toBe(
            new Date(Date.UTC(año, inicio - 1 + i, 10)).toISOString(),
          );
        });
        const matriculas = cuotas.filter((c) => c.concepto === 'MATRICULA');
        expect(matriculas).toHaveLength(1);
        expect(Number(matriculas[0].monto)).toBe(200);
        expect(matriculas[0].periodo).toBe(String(año));
        expect(matriculas[0].fechaVencimiento.toISOString()).toBe(
          new Date(Date.UTC(año, 2, 10)).toISOString(),
        );
        expect(result).not.toHaveProperty('mesInicio');
        expect(await history()).toBe(snapshot);
      },
    );

    it('revierte toda el alta si falla una mensualidad intermedia', async () => {
      const alumnoId = (await newAlumno()).id;
      const before = await count();
      await db.$executeRawUnsafe(`CREATE FUNCTION public.test_mes_falla() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.periodo='Agosto' AND EXISTS (SELECT 1 FROM inscripciones WHERE id=NEW."inscripcionId" AND "alumnoId"=${alumnoId})
        THEN RAISE EXCEPTION 'Fallo ficticio'; END IF;
        RETURN NEW;
      END $$`);
      try {
        await db.$executeRawUnsafe(
          'CREATE TRIGGER test_mes_falla BEFORE INSERT ON cuotas FOR EACH ROW EXECUTE FUNCTION public.test_mes_falla()',
        );
        await expect(
          service.create({ alumnoId, cursoId, año: 2026, mesInicio: 7 }),
        ).rejects.toThrow();
        expect(await count()).toEqual(before);
      } finally {
        await db.$executeRawUnsafe(
          'DROP TRIGGER IF EXISTS test_mes_falla ON cuotas',
        );
        await db.$executeRawUnsafe('DROP FUNCTION public.test_mes_falla()');
      }
    });

    it('no duplica inscripción ni cuotas al reintentar o competir', async () => {
      const alumnoId = (await newAlumno()).id;
      const body = { alumnoId, cursoId, año: 2026, mesInicio: 7 };
      const results = await Promise.allSettled([
        service.create(body),
        service.create(body),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(await db.inscripcion.count({ where: { alumnoId } })).toBe(1);
      const record = await db.inscripcion.findFirstOrThrow({
        where: { alumnoId },
      });
      const cuotas = await db.cuota.findMany({
        where: { inscripcionId: record.id },
        orderBy: { id: 'asc' },
      });
      expect(cuotas).toHaveLength(7);
      await expect(
        service.create({ ...body, mesInicio: 3 }),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        await db.cuota.findMany({
          where: { inscripcionId: record.id },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(cuotas);
      expect(await history()).toBe(snapshot);
    });
  },
);
