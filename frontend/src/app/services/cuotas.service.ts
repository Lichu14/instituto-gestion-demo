import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { Cuota, CuotaConDetalle } from '../models/cuota.model';
import { getApiBaseUrl } from '../core/api-config';
import { actualizarEstadoCuota } from '../shared/utils/cuotas.utils';

@Injectable({
  providedIn: 'root'
})
export class CuotasService {
  private readonly apiUrl = `${getApiBaseUrl()}/cuotas`;

  constructor(private readonly http: HttpClient) {}

  // GET /cuotas incluye inscripcion -> { alumno, curso }
  getAll(): Observable<CuotaConDetalle[]> {
    return this.http
      .get<CuotaConDetalle[]>(this.apiUrl)
      .pipe(map((cuotas) => cuotas.map((cuota) => actualizarEstadoCuota(cuota))));
  }

  // GET /cuotas no admite filtros en el backend: se obtienen todas y se filtran por inscripción
  getByInscripcion(inscripcionId: number): Observable<Cuota[]> {
    return this.http.get<Cuota[]>(this.apiUrl).pipe(
      map((cuotas) =>
        cuotas
          .filter((cuota) => cuota.inscripcionId === inscripcionId)
          .map((cuota) => actualizarEstadoCuota(cuota))
      )
    );
  }

  getById(id: number): Observable<Cuota> {
    return this.http
      .get<Cuota>(`${this.apiUrl}/${id}`)
      .pipe(map((cuota) => actualizarEstadoCuota(cuota)));
  }

  anular(id: number): Observable<Cuota> {
    return this.http.patch<Cuota>(`${this.apiUrl}/${id}`, { estado: 'ANULADA' });
  }
}
