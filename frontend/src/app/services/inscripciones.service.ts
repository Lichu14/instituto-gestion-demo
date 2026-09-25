import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from '../core/api-config';
import {
  CreateInscripcionRequest,
  Inscripcion,
  InscripcionConAlumnoCurso
} from '../models/inscripcion.model';

@Injectable({
  providedIn: 'root'
})
export class InscripcionesService {
  private readonly apiUrl = `${getApiBaseUrl()}/inscripciones`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<InscripcionConAlumnoCurso[]> {
    return this.http.get<InscripcionConAlumnoCurso[]>(this.apiUrl);
  }

  getById(id: number): Observable<InscripcionConAlumnoCurso> {
    return this.http.get<InscripcionConAlumnoCurso>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateInscripcionRequest): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(this.apiUrl, payload);
  }

  abandonar(id: number): Observable<InscripcionConAlumnoCurso> {
    return this.http.patch<InscripcionConAlumnoCurso>(`${this.apiUrl}/${id}/abandonar`, {});
  }

  completar(id: number): Observable<InscripcionConAlumnoCurso> {
    return this.http.patch<InscripcionConAlumnoCurso>(`${this.apiUrl}/${id}/completar`, {});
  }
}
