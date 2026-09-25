import type { Alumno } from './alumno.model';
import type { Curso } from './curso.model';
import type { Cuota } from './cuota.model';
import type { Inscripcion } from './inscripcion.model';

export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA';
export type EstadoPago = 'CONFIRMADO' | 'ANULADO';

export interface Pago {
  id: number;
  cuotaId: number;
  monto: string;
  fechaPago: string;
  medio: MedioPago;
  nombrePagador?: string | null;
  estado: EstadoPago;
  observaciones?: string | null;
  usuarioRegistroId?: number | null;
  usuarioRegistro?: { id: number; nombre: string } | null;
  fechaRegistro?: string | null;
}

export interface PagoEvento {
  id: number;
  pagoId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  accion: 'CREADO' | 'MODIFICADO' | 'ANULADO';
  anterior: Record<string, unknown> | null;
  nuevo: Record<string, unknown>;
  motivo: string | null;
}

// Respuesta de GET /pagos y GET /pagos/:id (incluyen cuota -> inscripcion -> alumno/curso)
export interface PagoConDetalle extends Pago {
  eventos?: PagoEvento[];
  cuota: Cuota & {
    inscripcion: Inscripcion & {
      alumno: Alumno;
      curso: Curso;
    };
  };
}

// Body de POST /pagos
export interface CreatePagoRequest {
  cuotaId: number;
  monto: number;
  medio: MedioPago;
  nombrePagador: string;
  observaciones?: string;
  fechaPago?: string;
}
