export type DiaSemana =
  | 'LUNES'
  | 'MARTES'
  | 'MIERCOLES'
  | 'JUEVES'
  | 'VIERNES'
  | 'SABADO'
  | 'DOMINGO';

export interface HorarioCurso {
  id: number;
  cursoId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

// Body de POST /cursos/:cursoId/horarios (cursoId va en la URL, no en el body)
export interface CreateHorarioCursoRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

// Body de PATCH /cursos/:cursoId/horarios/:horarioId
export interface UpdateHorarioCursoRequest {
  diaSemana?: DiaSemana;
  horaInicio?: string;
  horaFin?: string;
}
