import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateHorarioCursoRequest,
  HorarioCurso,
  UpdateHorarioCursoRequest
} from '../models/horario-curso.model';
import { getApiBaseUrl } from '../core/api-config';

@Injectable({
  providedIn: 'root'
})
export class HorariosCursoService {
  // El backend expone rutas anidadas: /cursos/:cursoId/horarios
  private readonly baseUrl = `${getApiBaseUrl()}/cursos`;

  constructor(private readonly http: HttpClient) {}

  getByCurso(cursoId: number): Observable<HorarioCurso[]> {
    return this.http.get<HorarioCurso[]>(`${this.baseUrl}/${cursoId}/horarios`);
  }

  create(
    cursoId: number,
    payload: CreateHorarioCursoRequest
  ): Observable<HorarioCurso> {
    return this.http.post<HorarioCurso>(
      `${this.baseUrl}/${cursoId}/horarios`,
      payload
    );
  }

  update(
    cursoId: number,
    horarioId: number,
    payload: UpdateHorarioCursoRequest
  ): Observable<HorarioCurso> {
    return this.http.patch<HorarioCurso>(
      `${this.baseUrl}/${cursoId}/horarios/${horarioId}`,
      payload
    );
  }

  delete(cursoId: number, horarioId: number): Observable<HorarioCurso> {
    return this.http.delete<HorarioCurso>(
      `${this.baseUrl}/${cursoId}/horarios/${horarioId}`
    );
  }
}
