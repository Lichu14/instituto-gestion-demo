import { EmailService } from './email.service';
import { Resend } from 'resend';
jest.mock('resend');
it('la distribución demo no crea clientes de email ni envía mensajes', async () => {
  await new EmailService().sendPaymentConfirmation({ comprobante: {buffer: Buffer.from('pdf'), filename: 'demo.pdf'}, alumnoEmail: 'demo@example.invalid', alumnoNombre: 'Demo', cuotaInfo: 'Demo', montoPagado: 10, medioPago: 'EFECTIVO', fechaPago: new Date(), nombrePagador: 'Demo' });
  expect(Resend).not.toHaveBeenCalled();
});
