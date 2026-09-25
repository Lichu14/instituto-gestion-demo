import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { actualizarEstadoCuota } from '../shared/utils/cuotas.utils';
import { Alumno, AlumnoConInscripciones, CreateAlumnoRequest, UpdateAlumnoRequest } from '../models/alumno.model';
import { getApiBaseUrl } from '../core/api-config';

@Injectable({
  providedIn: 'root'
})
export class AlumnosService {
  private readonly apiUrl = `${getApiBaseUrl()}/alumnos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Alumno[]> {
    return this.http.get<Alumno[]>(this.apiUrl);
  }

  getById(id: number): Observable<AlumnoConInscripciones> {
    return this.http.get<AlumnoConInscripciones>(`${this.apiUrl}/${id}`).pipe(
      map((alumno) => ({
        ...alumno,
        inscripciones: alumno.inscripciones.map((inscripcion) => ({
          ...inscripcion,
          // Compatible con el backend anterior durante un despliegue gradual.
          cuotas: inscripcion.cuotas.map((cuota) => cuota.saldo === undefined ? actualizarEstadoCuota(cuota) : cuota)
        }))
      }))
    );
  }

  descargarEstadoCuenta(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/estado-cuenta.pdf`, { responseType: 'blob' });
  }

  create(payload: CreateAlumnoRequest): Observable<Alumno> {
    return this.http.post<Alumno>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateAlumnoRequest): Observable<Alumno> {
    return this.http.patch<Alumno>(`${this.apiUrl}/${id}`, payload);
  }
}
