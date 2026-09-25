import { TipoCuota } from '../../generated/prisma/enums';

// Mes calendario (1-12) por período de mensualidad; espejo de ORDEN_MESES en
// frontend/src/app/shared/utils/cuotas.utils.ts (no hay paquete compartido
// entre Nest y Angular). La matrícula vence siempre en marzo.
const ORDEN_MESES: Record<string, number> = {
  Marzo: 3,
  Abril: 4,
  Mayo: 5,
  Junio: 6,
  Julio: 7,
  Agosto: 8,
  Septiembre: 9,
  Octubre: 10,
  Noviembre: 11,
  Diciembre: 12,
};

function mesDeCuota(concepto: TipoCuota, periodo: string): number | undefined {
  if (concepto === 'MATRICULA') {
    return 3;
  }
  return ORDEN_MESES[periodo];
}

/**
 * Es "futura" si su mes/año (según el año de la inscripción) todavía no
 * llegó al mes/año calendario actual. Se compara por período, no por el
 * campo `estado` (que puede estar desactualizado hasta que corra el cron).
 */
export function esCuotaFutura(
  concepto: TipoCuota,
  periodo: string,
  añoInscripcion: number,
  hoy = new Date(),
): boolean {
  const mes = mesDeCuota(concepto, periodo);
  if (mes === undefined) {
    return false;
  }

  const añoActual = hoy.getFullYear();
  if (añoInscripcion !== añoActual) {
    return añoInscripcion > añoActual;
  }

  return mes > hoy.getMonth() + 1;
}
