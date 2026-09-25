import express from 'express';
import request from 'supertest';
import { demoReadonly } from './demo-readonly';
const app = express();
app.use(demoReadonly);
app.use((_req, res) => res.status(200).json({ ok: true }));
describe('Protección de la demo pública', () => {
  it.each(['post', 'put', 'patch', 'delete'])('bloquea %s sin ejecutar la operación', async method => {
    await (request(app) as any)[method]('/api/pagos').expect(403);
  });
  it('permite login pero no otras escrituras de autenticación', async () => {
    await request(app).post('/api/auth/login').expect(200);
    await request(app).post('/api/auth/login/otra').expect(403);
  });
  it('permite consultas y PDF', async () => {
    await request(app).get('/api/alumnos').expect(200);
    await request(app).get('/api/pagos/1/comprobante.pdf').expect(200);
  });
});
