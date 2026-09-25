import { Injectable } from '@nestjs/common';

export interface SendPaymentConfirmationEmailInput {
  comprobante: { buffer: Buffer; filename: string };
  alumnoEmail: string;
  alumnoNombre: string;
  cuotaInfo: string;
  montoPagado: number;
  medioPago: string;
  fechaPago: Date;
  nombrePagador: string;
  observaciones?: string | null;
}

@Injectable()
export class EmailService {
  async sendPaymentConfirmation(_input: SendPaymentConfirmationEmailInput) {
    // La versión pública nunca envía correos, incluso si se configura una API key por error.
    return undefined;
  }
}
