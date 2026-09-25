import { Cuota } from '../../models/cuota.model';
import type { Pago } from '../../models/pago.model';

// Número de mes real para cada período de mensualidad generado por el backend
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
  Diciembre: 12
};

const claveOrden = (cuota: Cuota & { inscripcion?: { año: number } }): number => {
  if (cuota.concepto === 'MATRICULA') {
    return 0; // La matrícula siempre va primero
  }

  const mes = ORDEN_MESES[cuota.periodo];
  if (mes !== undefined) {
    return mes;
  }

  // Período desconocido (p.ej. otro año): se ordena por fecha de vencimiento
  const fecha = new Date(cuota.fechaVencimiento).getTime();
  return 100 + (isNaN(fecha) ? Number.MAX_SAFE_INTEGER : fecha / 86400000);
};

const añoDe = (cuota: Cuota & { inscripcion?: { año: number } }): number => {
  if (cuota.inscripcion?.año !== undefined) {
    return cuota.inscripcion.año;
  }

  // Fallback: si el período es un año numérico (p.ej. matrícula "2026")
  const periodoNumerico = Number(cuota.periodo);
  if (!isNaN(periodoNumerico) && periodoNumerico > 1900) {
    return periodoNumerico;
  }

  return 0;
};

function fechaLocal(fecha: string): Date | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!coincidencia) {
    return null;
  }

  const [, año, mes, dia] = coincidencia;
  return new Date(Number(año), Number(mes) - 1, Number(dia));
}

/**
 * Aplica la regla de vencimiento visible: una cuota pendiente o con pago
 * parcial se vence a partir del día siguiente a su fecha de vencimiento.
 */
export function actualizarEstadoCuota<T extends Cuota>(
  cuota: T,
  hoy = new Date()
): T {
  if (cuota.estado !== 'PENDIENTE' && cuota.estado !== 'PAGO_PARCIAL') {
    return cuota;
  }

  const vencimiento = fechaLocal(cuota.fechaVencimiento);
  const inicioDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  if (!vencimiento || inicioDeHoy <= vencimiento) {
    return cuota;
  }

  return { ...cuota, estado: 'VENCIDA' };
}

/**
 * Ordena las cuotas cronológicamente: año → matrícula → meses (Marzo → Diciembre).
 * El estado de pago (PENDIENTE / PAGO_PARCIAL / PAGADA) NUNCA influye en el orden.
 *
 * Cuando las cuotas traen `inscripcion.año` disponible (p.ej. GET /cuotas),
 * primero se agrupan por año. Sin ese dato, el comportamiento es idéntico al
 * original (matrícula primero, luego meses).
 *
 * No muta el array original.
 */
export function sortCuotas<T extends Cuota>(cuotas: T[]): T[] {
  return [...cuotas].sort((a, b) => {
    const añoA = añoDe(a);
    const añoB = añoDe(b);
    if (añoA !== añoB) {
      return añoA - añoB;
    }
    return claveOrden(a) - claveOrden(b);
  });
}

/**
 * Total pagado, sumando únicamente pagos CONFIRMADOS. Punto único de esta
 * regla para listas planas de pagos (p. ej. `cuota.pagos` embebidos).
 */
export function totalConfirmado(pagos: Pick<Pago, 'monto' | 'estado'>[]): number {
  return pagos
    .filter((p) => p.estado === 'CONFIRMADO')
    .reduce((acc, p) => acc + Number(p.monto), 0);
}

/**
 * Total pagado por cuota, agrupado por cuotaId. Solo cuenta pagos CONFIRMADOS:
 * los ANULADOS no reducen el saldo pendiente. Punto único de esta regla,
 * usado tanto por el panel de Cuotas como por el Dashboard.
 */
export function agruparPagosPorCuota(
  pagos: Pick<Pago, 'cuotaId' | 'monto' | 'estado'>[]
): Map<number, number> {
  const agrupados = new Map<number, number>();
  for (const pago of pagos) {
    if (pago.estado !== 'CONFIRMADO') {
      continue;
    }
    agrupados.set(pago.cuotaId, (agrupados.get(pago.cuotaId) ?? 0) + Number(pago.monto));
  }
  return agrupados;
}

// Mes calendario (1-12) de la cuota. La matrícula vence siempre en marzo
// (ver inscripciones.service.ts en el backend).
function mesDeCuota(cuota: Pick<Cuota, 'concepto' | 'periodo'>): number | undefined {
  if (cuota.concepto === 'MATRICULA') {
    return 3;
  }
  return ORDEN_MESES[cuota.periodo];
}

/**
 * Indica si la cuota corresponde al mes/año calendario actual (ni pasado ni futuro).
 * Se usa para no contar como deuda actual una cuota de un mes que todavía no llegó.
 */
export function esPeriodoActual(
  cuota: Cuota & { inscripcion?: { año: number } },
  hoy = new Date()
): boolean {
  const mes = mesDeCuota(cuota);
  if (mes === undefined) {
    return false;
  }
  return añoDe(cuota) === hoy.getFullYear() && mes === hoy.getMonth() + 1;
}

/**
 * Indica si una cuota representa deuda actual: ya está VENCIDA, o está
 * PENDIENTE/PAGO_PARCIAL y corresponde al mes/año calendario actual. Las
 * cuotas de meses futuros (aunque ya generadas y pagables anticipadamente)
 * quedan afuera hasta que llegue su período. Punto único de esta regla,
 * usado tanto por Cuotas como por el Dashboard.
 */
export function esDeudaActual(
  cuota: Cuota & { inscripcion?: { año: number } },
  hoy = new Date()
): boolean {
  if (cuota.estado === 'VENCIDA') {
    return true;
  }
  if (cuota.estado === 'PENDIENTE' || cuota.estado === 'PAGO_PARCIAL') {
    return esPeriodoActual(cuota, hoy);
  }
  return false;
}
