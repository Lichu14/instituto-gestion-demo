import type { Alumno } from './alumno.model';
import { Curso } from './curso.model';
import { CuotaConPagos } from './cuota.model';

export type EstadoInscripcion = 'ACTIVA' | 'COMPLETADA' | 'ABANDONADA';

export interface Inscripcion {
  id: number;
  alumnoId: number;
  cursoId: number;
  año: number;
  fechaInscripcion: string;
  descuentoPorcentaje: string;
  estado: EstadoInscripcion;
}

// Respuesta de GET /alumnos/:id -> inscripciones (incluye curso y cuotas con pagos)
export interface InscripcionConDetalle extends Inscripcion {
  curso: Curso;
  cuotas: CuotaConPagos[];
}

// Respuesta de GET /inscripciones y GET /inscripciones/:id (incluyen alumno y curso)
export interface InscripcionConAlumnoCurso extends Inscripcion {
  alumno: Alumno;
  curso: Curso;
}

// Body de POST /inscripciones
export interface CreateInscripcionRequest {
  alumnoId: number;
  cursoId: number;
  año: number;
  mesInicio: number;
  descuentoPorcentaje?: number;
}
