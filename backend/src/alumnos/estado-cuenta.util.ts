import { Prisma } from '../../generated/prisma/client';
import type { EstadoCuota, EstadoPago } from '../../generated/prisma/enums';

export const ZONA_ACADEMIA = 'America/Argentina/Buenos_Aires';

export function diaAcademia(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_ACADEMIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

type CuotaFinanciera = {
  monto: Prisma.Decimal;
  estado: EstadoCuota;
  fechaVencimiento: Date;
  pagos: { monto: Prisma.Decimal; estado: EstadoPago }[];
};

/** Proyección de lectura de las reglas ya usadas por la ficha del alumno.
 * No concilia estados manuales ni persiste el vencimiento en la base.
 */
export function proyectarCuota<T extends CuotaFinanciera>(
  cuota: T,
  ahora: Date,
) {
  const totalAbonado = cuota.pagos.reduce(
    (total, pago) =>
      pago.estado === 'CONFIRMADO' ? total.plus(pago.monto) : total,
    new Prisma.Decimal(0),
  );
  const estado: EstadoCuota =
    (cuota.estado === 'PENDIENTE' || cuota.estado === 'PAGO_PARCIAL') &&
    cuota.fechaVencimiento.toISOString().slice(0, 10) < diaAcademia(ahora)
      ? 'VENCIDA'
      : cuota.estado;
  return {
    ...cuota,
    estado,
    totalAbonado: totalAbonado.toFixed(2),
    saldo: cuota.monto.minus(totalAbonado).toFixed(2),
  };
}

export function resumirCuotas(
  cuotas: { estado: EstadoCuota; totalAbonado: string; saldo: string }[],
) {
  let abonado = new Prisma.Decimal(0);
  let pendiente = new Prisma.Decimal(0);
  let vencido = new Prisma.Decimal(0);
  for (const cuota of cuotas) {
    abonado = abonado.plus(cuota.totalAbonado);
    // Como en Cuotas/Dashboard, PAGADA y ANULADA no representan deuda.
    if (cuota.estado !== 'PAGADA' && cuota.estado !== 'ANULADA') {
      pendiente = pendiente.plus(cuota.saldo);
      if (cuota.estado === 'VENCIDA') vencido = vencido.plus(cuota.saldo);
    }
  }
  return {
    abonado: abonado.toFixed(2),
    pendiente: pendiente.toFixed(2),
    vencido: vencido.toFixed(2),
  };
}
