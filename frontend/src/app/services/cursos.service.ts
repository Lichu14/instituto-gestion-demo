import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateCursoRequest, CursoConDetalle, UpdateCursoRequest } from '../models/curso.model';
import { getApiBaseUrl } from '../core/api-config';

@Injectable({
  providedIn: 'root'
})
export class CursosService {
  private readonly apiUrl = `${getApiBaseUrl()}/cursos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<CursoConDetalle[]> {
    return this.http.get<CursoConDetalle[]>(this.apiUrl);
  }

  getById(id: number): Observable<CursoConDetalle> {
    return this.http.get<CursoConDetalle>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateCursoRequest): Observable<CursoConDetalle> {
    return this.http.post<CursoConDetalle>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateCursoRequest): Observable<CursoConDetalle> {
    return this.http.patch<CursoConDetalle>(`${this.apiUrl}/${id}`, payload);
  }
}
