import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generarComprobantePagoPdf } from './comprobante-pago.pdf';

// Solo datos que se entregan a la familia; nunca credenciales ni notas internas.
const comprobanteSelect = {
  id: true,
  monto: true,
  fechaPago: true,
  medio: true,
  nombrePagador: true,
  estado: true,
  fechaRegistro: true,
  usuarioRegistro: { select: { nombre: true } },
  cuota: {
    select: {
      concepto: true,
      periodo: true,
      inscripcion: {
        select: {
          año: true,
          curso: { select: { nombre: true } },
          alumno: { select: { nombre: true, apellido: true } },
        },
      },
    },
  },
} satisfies Prisma.PagoSelect;

export type PagoComprobante = Prisma.PagoGetPayload<{
  select: typeof comprobanteSelect;
}>;

@Injectable()
export class ComprobantePagoService {
  constructor(private readonly prisma: PrismaService) {}

  async generar(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      select: comprobanteSelect,
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return generarComprobantePagoPdf(
      pago,
      process.env.ACADEMIA_NOMBRE?.trim() || 'Instituto Gestión',
    );
  }
}
