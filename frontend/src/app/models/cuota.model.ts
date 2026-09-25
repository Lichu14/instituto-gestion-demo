import { Pago } from './pago.model';
import type { Alumno } from './alumno.model';
import type { Curso } from './curso.model';
import type { Inscripcion } from './inscripcion.model';

export type TipoCuota = 'MATRICULA' | 'MENSUALIDAD';
export type EstadoCuota =
  | 'PENDIENTE'
  | 'PAGO_PARCIAL'
  | 'PAGADA'
  | 'VENCIDA'
  | 'ANULADA';

export interface Cuota {
  id: number;
  inscripcionId: number;
  periodo: string;
  concepto: TipoCuota;
  monto: string;
  fechaVencimiento: string;
  estado: EstadoCuota;
}

// Respuesta de GET /alumnos/:id -> inscripciones.cuotas (incluye pagos)
export interface CuotaConPagos extends Cuota {
  pagos: Pago[];
  saldo?: string;
  totalAbonado?: string;
}

// Respuesta de GET /cuotas y GET /cuotas/:id (incluyen inscripcion -> alumno/curso)
export interface CuotaConDetalle extends Cuota {
  inscripcion: Inscripcion & {
    alumno: Alumno;
    curso: Curso;
  };
}
