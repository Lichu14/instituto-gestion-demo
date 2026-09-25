import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InscripcionesService } from '../../../services/inscripciones.service';
import { CuotasService } from '../../../services/cuotas.service';
import { InscripcionConAlumnoCurso } from '../../../models/inscripcion.model';
import { Cuota } from '../../../models/cuota.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { sortCuotas } from '../../../shared/utils/cuotas.utils';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-inscripcion-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState, ConfirmDialog],
  templateUrl: './inscripcion-detail.html',
  styleUrl: './inscripcion-detail.css'
})
export class InscripcionDetail implements OnInit {
  inscripcion = signal<InscripcionConAlumnoCurso | null>(null);
  cuotas = signal<Cuota[]>([]);
  loading = signal(true);
  cuotasLoading = signal(true);
  error = signal('');
  cuotasError = signal('');

  // Acciones de cambio de estado (abandonar / completar)
  abandonoPendiente = signal(false);
  completarPendiente = signal(false);
  accionSubmitting = signal(false);
  accionError = signal('');

  // Cuotas ordenadas cronológicamente (matrícula primero, luego meses).
  // El estado de pago nunca influye en el orden.
  cuotasOrdenadas = computed(() => sortCuotas(this.cuotas()));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly inscripcionesService: InscripcionesService,
    private readonly cuotasService: CuotasService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadInscripcion(id);
  }

  private loadInscripcion(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.inscripcionesService.getById(id).subscribe({
      next: (inscripcion) => {
        this.inscripcion.set(inscripcion);
        this.loading.set(false);
        this.loadCuotas(inscripcion.id);
      },
      error: () => {
        this.error.set('No se pudo obtener la información de la inscripción.');
        this.loading.set(false);
      }
    });
  }

  private loadCuotas(inscripcionId: number): void {
    this.cuotasLoading.set(true);
    this.cuotasError.set('');

    this.cuotasService.getByInscripcion(inscripcionId).subscribe({
      next: (cuotas) => {
        this.cuotas.set(cuotas);
        this.cuotasLoading.set(false);
      },
      error: () => {
        this.cuotasError.set('No se pudieron obtener las cuotas.');
        this.cuotasLoading.set(false);
      }
    });
  }

  retryCuotas(): void {
    const inscripcion = this.inscripcion();
    if (inscripcion) {
      this.loadCuotas(inscripcion.id);
    }
  }

  onAbandonar(): void {
    this.accionError.set('');
    this.abandonoPendiente.set(true);
  }

  cancelarAbandono(): void {
    this.abandonoPendiente.set(false);
  }

  confirmarAbandono(): void {
    const inscripcion = this.inscripcion();
    this.abandonoPendiente.set(false);
    if (!inscripcion || this.accionSubmitting()) {
      return;
    }

    this.accionSubmitting.set(true);
    this.accionError.set('');

    this.inscripcionesService.abandonar(inscripcion.id).subscribe({
      next: (actualizada) => {
        this.accionSubmitting.set(false);
        this.inscripcion.set(actualizada);
        this.loadCuotas(actualizada.id);
      },
      error: () => {
        this.accionSubmitting.set(false);
        this.accionError.set('No se pudo marcar la inscripción como abandonada.');
      }
    });
  }

  onCompletar(): void {
    this.accionError.set('');
    this.completarPendiente.set(true);
  }

  cancelarCompletar(): void {
    this.completarPendiente.set(false);
  }

  confirmarCompletar(): void {
    const inscripcion = this.inscripcion();
    this.completarPendiente.set(false);
    if (!inscripcion || this.accionSubmitting()) {
      return;
    }

    this.accionSubmitting.set(true);
    this.accionError.set('');

    this.inscripcionesService.completar(inscripcion.id).subscribe({
      next: (actualizada) => {
        this.accionSubmitting.set(false);
        this.inscripcion.set(actualizada);
        this.loadCuotas(actualizada.id);
      },
      error: () => {
        this.accionSubmitting.set(false);
        this.accionError.set('No se pudo marcar la inscripción como completada.');
      }
    });
  }
}
