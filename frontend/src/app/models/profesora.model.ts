export type EstadoProfesora = 'ACTIVA' | 'INACTIVA';

export interface Profesora {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email?: string | null;
  fechaIngreso: string;
  estado: EstadoProfesora;
}

// Body de POST /profesoras (fechaIngreso en formato YYYY-MM-DD)
export interface CreateProfesoraRequest {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email?: string;
  fechaIngreso: string;
}
