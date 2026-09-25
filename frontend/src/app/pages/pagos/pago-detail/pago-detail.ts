import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagosService } from '../../../services/pagos.service';
import { PagoConDetalle, PagoEvento } from '../../../models/pago.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ComprobantePago } from '../../../shared/comprobante-pago/comprobante-pago';
import { PagoRegistro } from '../../../shared/pago-registro/pago-registro';

@Component({
  selector: 'app-pago-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState, PagoRegistro, ComprobantePago],
  templateUrl: './pago-detail.html',
  styleUrl: './pago-detail.css'
})
export class PagoDetail implements OnInit {
  readonly acciones = { CREADO: 'Pago registrado', MODIFICADO: 'Datos modificados', ANULADO: 'Pago anulado' };

  describirCambios(evento: PagoEvento): string {
    const campos: Record<string, string> = { nombrePagador: 'Pagador', medio: 'Medio', fechaPago: 'Fecha del pago', observaciones: 'Observaciones' };
    const formato = new FormatFechaPipe();
    const valor = (campo: string, dato: unknown) => campo === 'fechaPago'
      ? formato.transform(typeof dato === 'string' ? dato : null, 'time') : String(dato || 'Sin datos');
    return Object.entries(campos).filter(([campo]) => evento.anterior?.[campo] !== evento.nuevo[campo])
      .map(([campo, etiqueta]) => `${etiqueta}: ${valor(campo, evento.anterior?.[campo])} → ${valor(campo, evento.nuevo[campo])}`).join(' · ');
  }
  pago = signal<PagoConDetalle | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pagosService: PagosService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.loading.set(true);
    this.error.set('');

    this.pagosService.getById(id).subscribe({
      next: (pago) => {
        this.pago.set(pago);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener la información del pago.');
        this.loading.set(false);
      }
    });
  }
}
