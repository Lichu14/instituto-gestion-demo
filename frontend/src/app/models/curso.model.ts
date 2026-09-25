import { Profesora } from './profesora.model';
import { CreateHorarioCursoRequest, HorarioCurso } from './horario-curso.model';

export type EstadoCurso = 'ACTIVO' | 'ARCHIVADO';

export interface Curso {
  id: number;
  nombre: string;
  precioMensual: string;
  precioMatricula: string;
  estado: EstadoCurso;
  profesoraId: number;
}

// Respuesta de GET /cursos y GET /cursos/:id (incluyen profesora y horarios)
export interface CursoConDetalle extends Curso {
  profesora: Profesora;
  horarios: HorarioCurso[];
}

// Body de POST /cursos (según CreateCursoDto del backend; requiere al menos 1 horario)
export interface CreateCursoRequest {
  nombre: string;
  precioMensual: number;
  precioMatricula: number;
  profesoraId: number;
  horarios: CreateHorarioCursoRequest[];
}

// Body de PATCH /cursos/:id (según UpdateCursoDto del backend)
export interface UpdateCursoRequest {
  nombre?: string;
  precioMensual?: number;
  precioMatricula?: number;
  profesoraId?: number;
  estado?: EstadoCurso;
}
