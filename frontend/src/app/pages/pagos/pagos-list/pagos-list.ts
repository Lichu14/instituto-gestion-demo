import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PagosService } from '../../../services/pagos.service';
import { PagoConDetalle } from '../../../models/pago.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ComprobantePago } from '../../../shared/comprobante-pago/comprobante-pago';
import { PagoRegistro } from '../../../shared/pago-registro/pago-registro';

@Component({
  selector: 'app-pagos-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState, PagoRegistro, ComprobantePago],
  templateUrl: './pagos-list.html',
  styleUrl: './pagos-list.css'
})
export class PagosList implements OnInit {
  pagos = signal<PagoConDetalle[]>([]);
  searchTerm = signal('');
  loading = signal(false);
  error = signal('');

  // Búsqueda global en frontend sobre los datos ya recibidos (GET /pagos
  // incluye cuota -> inscripcion -> alumno/curso). Sin selector de criterio.
  filteredPagos = computed(() => {
    const term = this.normalize(this.searchTerm());
    if (!term) {
      return this.pagos();
    }

    return this.pagos().filter((pago) => {
      const alumno = pago.cuota.inscripcion.alumno;
      const campos = [
        alumno.nombre,
        alumno.apellido,
        `${alumno.nombre} ${alumno.apellido}`,
        `${alumno.apellido} ${alumno.nombre}`,
        alumno.dni,
        alumno.telefono,
        alumno.email ?? '',
        pago.cuota.inscripcion.curso.nombre,
        pago.cuota.periodo,
        pago.cuota.concepto,
        pago.nombrePagador ?? '',
        pago.medio,
        pago.estado
      ];

      return campos.some((campo) => this.normalize(campo).includes(term));
    });
  });

  constructor(private readonly pagosService: PagosService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    this.pagosService.getAll().subscribe({
      next: (pagos) => {
        this.pagos.set(pagos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el listado de pagos.');
        this.loading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
