import { InscripcionConDetalle } from './inscripcion.model';

export type EstadoAlumno = 'ACTIVO' | 'ARCHIVADO';

export interface Alumno {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email?: string | null;
  estado: EstadoAlumno;
  fechaAlta: string;
}

// Respuesta de GET /alumnos/:id
export interface AlumnoConInscripciones extends Alumno {
  inscripciones: InscripcionConDetalle[];
}

// Body de POST /alumnos (según CreateAlumnoDto del backend; sin "estado", que el backend fija en ACTIVO)
export interface CreateAlumnoRequest {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email?: string;
}

// Body de PATCH /alumnos/:id (según UpdateAlumnoDto del backend)
export interface UpdateAlumnoRequest {
  dni?: string;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;
  estado?: EstadoAlumno;
  fechaAlta?: string;
}
