import type { Pago, Prisma } from '../../generated/prisma/client';

// Nunca incluir el usuario completo: contiene el hash de contraseña y otros datos internos.
export const registroPagoInclude = {
  usuarioRegistro: { select: { id: true, nombre: true } },
} satisfies Prisma.PagoInclude;

export function snapshotPago(pago: Pago): Prisma.InputJsonObject {
  return {
    cuotaId: pago.cuotaId,
    monto: pago.monto.toString(),
    fechaPago: pago.fechaPago.toISOString(),
    medio: pago.medio,
    nombrePagador: pago.nombrePagador,
    estado: pago.estado,
    observaciones: pago.observaciones,
  };
}
