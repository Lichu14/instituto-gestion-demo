import { describe, expect, it } from 'vitest';
import { Cuota } from '../../models/cuota.model';
import {
  actualizarEstadoCuota,
  agruparPagosPorCuota,
  esPeriodoActual,
  esDeudaActual
} from './cuotas.utils';

const cuotaBase: Cuota = {
  id: 1,
  inscripcionId: 1,
  periodo: 'Septiembre',
  concepto: 'MENSUALIDAD',
  monto: '10000',
  fechaVencimiento: '2026-09-10',
  estado: 'PENDIENTE'
};

describe('actualizarEstadoCuota', () => {
  it('mantiene la cuota pendiente hasta el día 10 inclusive', () => {
    const cuota = actualizarEstadoCuota(cuotaBase, new Date(2026, 8, 10));

    expect(cuota.estado).toBe('PENDIENTE');
  });

  it('vence cuotas pendientes o con pago parcial desde el día 11', () => {
    const pendiente = actualizarEstadoCuota(cuotaBase, new Date(2026, 8, 11));
    const parcial = actualizarEstadoCuota(
      { ...cuotaBase, estado: 'PAGO_PARCIAL' },
      new Date(2026, 8, 11)
    );

    expect(pendiente.estado).toBe('VENCIDA');
    expect(parcial.estado).toBe('VENCIDA');
  });

  it('no cambia cuotas pagadas o anuladas', () => {
    const pagada = actualizarEstadoCuota(
      { ...cuotaBase, estado: 'PAGADA' },
      new Date(2026, 8, 11)
    );
    const anulada = actualizarEstadoCuota(
      { ...cuotaBase, estado: 'ANULADA' },
      new Date(2026, 8, 11)
    );

    expect(pagada.estado).toBe('PAGADA');
    expect(anulada.estado).toBe('ANULADA');
  });
});

describe('agruparPagosPorCuota', () => {
  it('suma solo pagos CONFIRMADOS y excluye los ANULADOS', () => {
    const mapa = agruparPagosPorCuota([
      { cuotaId: 1, monto: '5000', estado: 'CONFIRMADO' },
      { cuotaId: 1, monto: '3000', estado: 'ANULADO' },
      { cuotaId: 2, monto: '1000', estado: 'CONFIRMADO' }
    ]);

    expect(mapa.get(1)).toBe(5000);
    expect(mapa.get(2)).toBe(1000);
  });
});

describe('esPeriodoActual', () => {
  const hoy = new Date(2026, 8, 12); // 12/09/2026
  const conAño = { ...cuotaBase, inscripcion: { año: 2026 } };

  it('es true para una mensualidad del mes y año actuales', () => {
    expect(esPeriodoActual({ ...conAño, periodo: 'Septiembre' }, hoy)).toBe(true);
  });

  it('es false para una mensualidad de un mes futuro', () => {
    expect(esPeriodoActual({ ...conAño, periodo: 'Octubre' }, hoy)).toBe(false);
  });

  it('es false para una mensualidad de un mes pasado', () => {
    expect(esPeriodoActual({ ...conAño, periodo: 'Agosto' }, hoy)).toBe(false);
  });

  it('trata la matrícula como perteneciente a marzo', () => {
    const matricula = { ...conAño, concepto: 'MATRICULA' as const, periodo: '2026' };
    expect(esPeriodoActual(matricula, new Date(2026, 2, 15))).toBe(true);
    expect(esPeriodoActual(matricula, hoy)).toBe(false);
  });
});

describe('esDeudaActual', () => {
  const hoy = new Date(2026, 8, 12); // 12/09/2026
  const conAño = { ...cuotaBase, inscripcion: { año: 2026 } };

  it('cuenta una cuota VENCIDA de un mes anterior', () => {
    expect(esDeudaActual({ ...conAño, periodo: 'Agosto', estado: 'VENCIDA' }, hoy)).toBe(true);
  });

  it('cuenta una cuota PENDIENTE del mes actual', () => {
    expect(esDeudaActual({ ...conAño, periodo: 'Septiembre', estado: 'PENDIENTE' }, hoy)).toBe(true);
  });

  it('cuenta una cuota PAGO_PARCIAL del mes actual', () => {
    expect(esDeudaActual({ ...conAño, periodo: 'Septiembre', estado: 'PAGO_PARCIAL' }, hoy)).toBe(
      true
    );
  });

  it('no cuenta una cuota PENDIENTE de un mes futuro', () => {
    expect(esDeudaActual({ ...conAño, periodo: 'Octubre', estado: 'PENDIENTE' }, hoy)).toBe(false);
  });

  it('no cuenta una cuota PAGADA ni ANULADA', () => {
    expect(esDeudaActual({ ...conAño, periodo: 'Septiembre', estado: 'PAGADA' }, hoy)).toBe(false);
    expect(esDeudaActual({ ...conAño, periodo: 'Agosto', estado: 'ANULADA' }, hoy)).toBe(false);
  });
});