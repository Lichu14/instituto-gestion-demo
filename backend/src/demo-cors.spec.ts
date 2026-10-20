import { Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from './create-app';

const reached = jest.fn();
@Controller('inscripciones')
class InscripcionProbe {
  @Post()
  create() {
    reached();
    return { id: 1 };
  }
}

describe('Demo: CORS en el rechazo de una inscripción', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InscripcionProbe],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it.each([
    'http://localhost:4201',
    'https://instituto-gestion-demo.vercel.app',
  ])(
    'permite leer el aviso 403 desde %s sin ejecutar el alta',
    async (origin) => {
      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Origin', origin)
        .send({ alumnoId: 1, cursoId: 1, año: 2026, mesInicio: 7 })
        .expect(403);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.body.error).toBe('DemoReadOnly');
      expect(reached).not.toHaveBeenCalled();
    },
  );
  it('conserva el preflight del formulario sin ejecutar escrituras', async () => {
    await request(app.getHttpServer())
      .options('/api/inscripciones')
      .set('Origin', 'http://localhost:4201')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization')
      .expect(204);
    expect(reached).not.toHaveBeenCalled();
  });
});
