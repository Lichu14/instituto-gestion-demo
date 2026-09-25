import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs';
import { getApiBaseUrl } from '../core/api-config';
import {
  CreatePagoRequest,
  Pago,
  PagoConDetalle
} from '../models/pago.model';
import { actualizarEstadoCuota } from '../shared/utils/cuotas.utils';

@Injectable({
  providedIn: 'root'
})
export class PagosService {
  private readonly apiUrl = `${getApiBaseUrl()}/pagos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<PagoConDetalle[]> {
    return this.http.get<PagoConDetalle[]>(this.apiUrl).pipe(
      map((pagos) =>
        pagos.map((pago) => ({
          ...pago,
          cuota: actualizarEstadoCuota(pago.cuota)
        }))
      )
    );
  }

  // Mismo endpoint que getAll pero sin necesidad de las relaciones anidadas
  getAllSimple(): Observable<Pago[]> {
    return this.http.get<Pago[]>(this.apiUrl);
  }

  getById(id: number): Observable<PagoConDetalle> {
    return this.http.get<PagoConDetalle>(`${this.apiUrl}/${id}`).pipe(
      map((pago) => ({
        ...pago,
        cuota: actualizarEstadoCuota(pago.cuota)
      }))
    );
  }

  create(payload: CreatePagoRequest): Observable<Pago> {
    return this.http.post<Pago>(this.apiUrl, payload);
  }

  descargarComprobante(id: number) {
    return this.http.get(`${this.apiUrl}/${id}/comprobante.pdf`, {
      responseType: 'blob', observe: 'response',
    });
  }

  // GET /pagos no admite filtros en el backend: se obtienen todos y se filtran por cuota
  getByCuota(cuotaId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(this.apiUrl).pipe(
      map((pagos) => pagos.filter((pago) => pago.cuotaId === cuotaId))
    );
  }
}
