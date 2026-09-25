import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AlumnosService } from '../../../services/alumnos.service';
import { CuotasService } from '../../../services/cuotas.service';
import { AlumnoConInscripciones } from '../../../models/alumno.model';
import { CuotaConPagos } from '../../../models/cuota.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { sortCuotas, totalConfirmado } from '../../../shared/utils/cuotas.utils';
import { finalize } from 'rxjs';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { ComprobantePago } from '../../../shared/comprobante-pago/comprobante-pago';
import { PagoRegistro } from '../../../shared/pago-registro/pago-registro';

@Component({
  selector: 'app-alumno-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState, ConfirmDialog, PagoRegistro, ComprobantePago],
  templateUrl: './alumno-detail.html',
  styleUrl: './alumno-detail.css'
})
export class AlumnoDetail implements OnInit {
  alumno = signal<AlumnoConInscripciones | null>(null);
  loading = signal(true);
  error = signal('');

  cuotaAAnular = signal<CuotaConPagos | null>(null);
  anulandoId = signal<number | null>(null);
  anularError = signal('');
  descargandoEstadoCuenta = signal(false);
  descargaError = signal('');
  inscripcionesDesplegadas = signal<Record<number, boolean>>({});

  // Cuotas ordenadas cronológicamente (matrícula primero, luego meses).
  // El estado de pago nunca influye en el orden.
  inscripcionesOrdenadas = computed(() =>
    (this.alumno()?.inscripciones ?? []).map((inscripcion) => ({
      ...inscripcion,
      cuotas: sortCuotas(inscripcion.cuotas)
    }))
  );

  constructor(
    private readonly route: ActivatedRoute,
    private readonly alumnosService: AlumnosService,
    private readonly cuotasService: CuotasService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAlumno(id);
  }

  private loadAlumno(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.alumnosService.getById(id).subscribe({
      next: (alumno) => {
        this.inscripcionesDesplegadas.update((estadoActual) => {
          const siguiente = { ...estadoActual };
          for (const inscripcion of alumno.inscripciones) {
            if (siguiente[inscripcion.id] === undefined) {
              siguiente[inscripcion.id] = inscripcion.estado === 'ACTIVA';
            }
          }
          return siguiente;
        });
        this.alumno.set(alumno);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener la información del alumno.');
        this.loading.set(false);
      }
    });
  }

  // La ficha y el PDF reciben la misma proyección financiera del backend.
  saldoCuota(cuota: CuotaConPagos): number {
    return cuota.saldo === undefined
      ? Number(cuota.monto) - totalConfirmado(cuota.pagos)
      : Number(cuota.saldo);
  }

  inscripcionDesplegada(id: number): boolean {
    return this.inscripcionesDesplegadas()[id] ?? false;
  }

  alternarInscripcion(id: number): void {
    this.inscripcionesDesplegadas.update((estadoActual) => ({
      ...estadoActual,
      [id]: !this.inscripcionDesplegada(id),
    }));
  }

  descargarEstadoCuenta(): void {
    const alumno = this.alumno();
    if (!alumno || this.descargandoEstadoCuenta()) return;
    this.descargaError.set('');
    this.descargandoEstadoCuenta.set(true);
    this.alumnosService.descargarEstadoCuenta(alumno.id)
      .pipe(finalize(() => this.descargandoEstadoCuenta.set(false)))
      .subscribe({
        next: (pdf) => {
          let url: string | undefined;
          try {
            url = URL.createObjectURL(pdf);
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.download = `estado-cuenta-alumno-${alumno.id}.pdf`;
            document.body.appendChild(enlace);
            try { enlace.click(); } finally { enlace.remove(); }
          } catch {
            this.descargaError.set('No se pudo descargar el estado de cuenta. Intentá nuevamente.');
          } finally {
            // Give the browser time to begin the download before releasing the Blob.
            if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
          }
        },
        error: () => this.descargaError.set('No se pudo descargar el estado de cuenta. Intentá nuevamente.'),
      });
  }

  // Solo se ofrece la acción para cuotas que todavía no fueron pagadas ni
  // anuladas; anular una PAGADA requeriría definir el impacto en sus pagos.
  puedeAnularse(cuota: CuotaConPagos): boolean {
    return cuota.estado !== 'PAGADA' && cuota.estado !== 'ANULADA';
  }

  onAnularCuota(cuota: CuotaConPagos): void {
    if (this.anulandoId() !== null) {
      return;
    }
    this.anularError.set('');
    this.cuotaAAnular.set(cuota);
  }

  confirmarAnularCuota(): void {
    const cuota = this.cuotaAAnular();
    if (!cuota) {
      return;
    }
    this.cuotaAAnular.set(null);
    this.anulandoId.set(cuota.id);

    this.cuotasService.anular(cuota.id).subscribe({
      next: () => {
        this.anulandoId.set(null);
        const alumno = this.alumno();
        if (alumno) {
          this.loadAlumno(alumno.id);
        }
      },
      error: () => {
        this.anulandoId.set(null);
        this.anularError.set('No se pudo anular la cuota.');
      }
    });
  }

  cancelarAnularCuota(): void {
    this.cuotaAAnular.set(null);
  }
}
