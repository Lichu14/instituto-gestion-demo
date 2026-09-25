import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from '../core/api-config';
import {
  CreateProfesoraRequest,
  Profesora
} from '../models/profesora.model';

@Injectable({
  providedIn: 'root'
})
export class ProfesorasService {
  private readonly apiUrl = `${getApiBaseUrl()}/profesoras`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Profesora[]> {
    return this.http.get<Profesora[]>(this.apiUrl);
  }

  getById(id: number): Observable<Profesora> {
    return this.http.get<Profesora>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateProfesoraRequest): Observable<Profesora> {
    return this.http.post<Profesora>(this.apiUrl, payload);
  }
}
