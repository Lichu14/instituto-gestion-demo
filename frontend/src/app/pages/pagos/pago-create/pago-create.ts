import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AlumnosService } from '../../../services/alumnos.service';
import { CuotasService } from '../../../services/cuotas.service';
import { InscripcionesService } from '../../../services/inscripciones.service';
import { PagosService } from '../../../services/pagos.service';
import { Alumno, AlumnoConInscripciones } from '../../../models/alumno.model';
import { Cuota } from '../../../models/cuota.model';
import { Curso } from '../../../models/curso.model';
import { InscripcionConDetalle } from '../../../models/inscripcion.model';
import { CreatePagoRequest, MedioPago, Pago } from '../../../models/pago.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { sortCuotas, totalConfirmado } from '../../../shared/utils/cuotas.utils';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ComprobantePago } from '../../../shared/comprobante-pago/comprobante-pago';
import { PagoRegistro } from '../../../shared/pago-registro/pago-registro';

/**
 * Componente centralizado para registrar pagos.
 *
 * Soporta dos modos según la ruta:
 * - /cuotas/:cuotaId/pago → la cuota ya viene determinada (desde Inscripción o Alumno).
 * - /pagos/nuevo          → el usuario selecciona Alumno → Inscripción → Cuota.
 *
 * Ambos terminan en el mismo POST /pagos.
 */
@Component({
  selector: 'app-pago-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState, PagoRegistro, ComprobantePago],
  templateUrl: './pago-create.html',
  styleUrl: './pago-create.css'
})
export class PagoCreate implements OnInit {
  // true cuando se ingresó con /cuotas/:cuotaId/pago
  readonly cuotaFija = signal(false);

  cuotaId = 0;

  // Datos del modo con cuota fija
  cuota = signal<Cuota | null>(null);

  // Contexto visual (se completa según el modo)
  alumnoInfo = signal<Alumno | null>(null);
  cursoInfo = signal<Curso | null>(null);

  // Datos del modo /pagos/nuevo (cascada)
  alumnos = signal<Alumno[]>([]);
  alumnoSeleccionadoId = signal<number | null>(null);
  alumnoDetalle = signal<AlumnoConInscripciones | null>(null);
  inscripcionDetalle = signal<InscripcionConDetalle | null>(null);
  loadingInscripciones = signal(false);
  inscripcionesError = signal('');

  // Estado compartido
  pagos = signal<Pago[]>([]);
  loadingData = signal(true);
  loadError = signal('');
  submitting = signal(false);
  submitError = signal('');
  successMessage = signal('');

  // Cálculos visuales sobre datos recibidos del backend.
  // El servicio ya refleja el vencimiento según la fecha actual.
  totalPagado = computed(() =>
    totalConfirmado(this.pagos())
  );

  saldo = computed(() => {
    const cuota = this.cuota();
    if (!cuota) {
      return 0;
    }
    return Number(cuota.monto) - this.totalPagado();
  });

  // Selectores dependientes (modo /pagos/nuevo)
  inscripciones = computed(
    () => this.alumnoDetalle()?.inscripciones ?? []
  );

  cuotas = computed(() => this.inscripcionDetalle()?.cuotas ?? []);

  // Cuotas sobre las que se puede registrar un pago (restricción de UX;
  // la validación definitiva sigue estando en el backend), ordenadas
  // cronológicamente: matrícula primero, luego meses.
  cuotasDisponibles = computed(() =>
    sortCuotas(this.cuotas().filter((cuota) => cuota.estado !== 'PAGADA' && cuota.estado !== 'ANULADA'))
  );

  // Selectores de la cascada (solo se usan en modo /pagos/nuevo)
  readonly selectionForm = new FormGroup({
    alumnoId: new FormControl<number | null>(null),
    inscripcionId: new FormControl<number | null>({ value: null, disabled: true }),
    cuotaId: new FormControl<number | null>({ value: null, disabled: true })
  });

  // Campos según CreatePagoDto del backend (cuotaId se resuelve por contexto)
  readonly form = new FormGroup({
    nombrePagador: new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    monto: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01)
    ]),
    medio: new FormControl<MedioPago | null>(null, Validators.required),
    fechaPago: new FormControl<string>(''),
    observaciones: new FormControl<string>('')
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly alumnosService: AlumnosService,
    private readonly cuotasService: CuotasService,
    private readonly inscripcionesService: InscripcionesService,
    private readonly pagosService: PagosService
  ) {}

  ngOnInit(): void {
    const cuotaIdParam = this.route.snapshot.paramMap.get('cuotaId');

    if (cuotaIdParam !== null) {
      this.cuotaFija.set(true);
      this.cuotaId = Number(cuotaIdParam);
      this.loadCuotaContext(this.cuotaId, true);
    } else {
      this.cuotaFija.set(false);
      this.loadAlumnos();
    }
  }

  // ---------- Modo cuota fija (/cuotas/:cuotaId/pago) ----------

  private loadCuotaContext(cuotaId: number, initial: boolean): void {
    if (initial) {
      this.loadingData.set(true);
      this.loadError.set('');
    }

    forkJoin({
      cuota: this.cuotasService.getById(cuotaId),
      pagos: this.pagosService.getByCuota(cuotaId)
    }).subscribe({
      next: ({ cuota, pagos }) => {
        this.cuota.set(cuota);
        this.pagos.set(pagos);
        this.updateMontoValidator();

        if (initial) {
          this.loadingData.set(false);
          this.loadInscripcionContext(cuota.inscripcionId);
        }
      },
      error: () => {
        if (initial) {
          this.loadError.set(
            'No se pudo obtener la información de la cuota.'
          );
          this.loadingData.set(false);
        }
      }
    });
  }

  goBack(event: MouseEvent): void {
    event.preventDefault();
    this.location.back();
  }

  // Contexto informativo (alumno/curso) usando un endpoint ya existente
  private loadInscripcionContext(inscripcionId: number): void {
    this.inscripcionesService.getById(inscripcionId).subscribe({
      next: (inscripcion) => {
        this.alumnoInfo.set(inscripcion.alumno);
        this.cursoInfo.set(inscripcion.curso);
      },
      error: () => {
        // Contexto informativo opcional: no bloquea el registro del pago
      }
    });
  }

  // ---------- Modo cascada (/pagos/nuevo) ----------

  private loadAlumnos(): void {
    this.loadingData.set(true);
    this.loadError.set('');

    this.alumnosService.getAll().subscribe({
      next: (alumnos) => {
        this.alumnos.set(alumnos);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo obtener el listado de alumnos.');
        this.loadingData.set(false);
      }
    });
  }

  onAlumnoChange(alumnoIdValue: string): void {
    const alumnoId = Number(alumnoIdValue);
    this.alumnoSeleccionadoId.set(alumnoId);
    this.inscripcionesError.set('');

    // Limpiar selecciones y datos dependientes
    this.inscripcionDetalle.set(null);
    this.cuota.set(null);
    this.cursoInfo.set(null);
    this.pagos.set([]);
    this.selectionForm.controls.inscripcionId.setValue(null);
    this.selectionForm.controls.cuotaId.setValue(null);

    this.loadingInscripciones.set(true);

    this.alumnosService.getById(alumnoId).subscribe({
      next: (alumno) => {
        this.alumnoDetalle.set(alumno);
        this.alumnoInfo.set(alumno);
        this.loadingInscripciones.set(false);

        if (alumno.inscripciones.length > 0) {
          this.selectionForm.controls.inscripcionId.enable();
        } else {
          this.selectionForm.controls.inscripcionId.disable();
        }
        this.selectionForm.controls.cuotaId.disable();
      },
      error: () => {
        this.alumnoDetalle.set(null);
        this.alumnoInfo.set(null);
        this.inscripcionesError.set('No se pudieron cargar las inscripciones del alumno.');
        this.loadingInscripciones.set(false);
        this.selectionForm.controls.inscripcionId.disable();
        this.selectionForm.controls.cuotaId.disable();
      }
    });
  }

  retryInscripciones(): void {
    const alumnoId = this.alumnoSeleccionadoId();
    if (alumnoId !== null) {
      this.onAlumnoChange(String(alumnoId));
    }
  }

  onInscripcionChange(inscripcionIdValue: string): void {
    const inscripcionId = Number(inscripcionIdValue);

    const inscripcion =
      this.alumnoDetalle()?.inscripciones.find((i) => i.id === inscripcionId) ??
      null;

    this.inscripcionDetalle.set(inscripcion);
    this.cursoInfo.set(inscripcion?.curso ?? null);

    // Limpiar selección y datos dependientes
    this.cuota.set(null);
    this.pagos.set([]);
    this.selectionForm.controls.cuotaId.setValue(null);

    if (inscripcion && inscripcion.cuotas.length > 0) {
      this.selectionForm.controls.cuotaId.enable();
    } else {
      this.selectionForm.controls.cuotaId.disable();
    }
  }

  onCuotaChange(cuotaIdValue: string): void {
    const cuotaId = Number(cuotaIdValue);

    const cuota = this.cuotas().find((c) => c.id === cuotaId) ?? null;
    this.cuota.set(cuota);
    this.cuotaId = cuotaId;

    if (cuota) {
      // CuotaConPagos ya trae los pagos asociados: no hace falta otra llamada
      this.pagos.set(cuota.pagos ?? []);
    } else {
      this.pagos.set([]);
    }

    this.updateMontoValidator();
  }

  // Mejora de UX: no permitir un monto mayor al saldo pendiente.
  // La validación definitiva sigue estando en el backend.
  private updateMontoValidator(): void {
    const montoControl = this.form.controls.monto;
    const saldo = this.saldo();

    if (this.cuota() && saldo > 0) {
      montoControl.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(saldo)
      ]);
    } else {
      montoControl.setValidators([Validators.required, Validators.min(0.01)]);
    }

    montoControl.updateValueAndValidity();
  }

  // ---------- Envío (compartido por los dos modos) ----------

  onSubmit(): void {
    const cuota = this.cuota();
    if (!cuota || this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreatePagoRequest = {
      cuotaId: cuota.id,
      monto: Number(raw.monto),
      medio: raw.medio as MedioPago,
      nombrePagador: (raw.nombrePagador ?? '').trim()
    };

    if (raw.observaciones) {
      payload.observaciones = raw.observaciones;
    }
    if (raw.fechaPago) {
      const fecha = new Date(raw.fechaPago);
      if (Number.isNaN(fecha.getTime())) {
        this.submitError.set('Ingresá una fecha de pago válida.');
        return;
      }
      payload.fechaPago = fecha.toISOString();
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.successMessage.set('');

    this.pagosService.create(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Pago registrado correctamente.');
        // Limpia el formulario pero mantiene el contexto visible
        this.form.reset({ nombrePagador: '', monto: null, medio: null, fechaPago: '', observaciones: '' });
        // Refresca cuota y pagos para mostrar el estado real del backend
        this.refreshAfterPago();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(this.extractErrorMessage(err));
      }
    });
  }

  // Después de un pago exitoso, refrescar la información real del backend
  private refreshAfterPago(): void {
    if (this.cuotaFija()) {
      this.loadCuotaContext(this.cuotaId, false);
      return;
    }

    // Modo cascada: el alumno queda seleccionado; solo se recargan sus datos
    const alumnoId = this.alumnoSeleccionadoId();
    if (alumnoId === null) {
      return;
    }

    this.alumnosService.getById(alumnoId).subscribe({
      next: (alumno) => {
        this.alumnoDetalle.set(alumno);
        this.alumnoInfo.set(alumno);

        const inscripcionId = this.selectionForm.controls.inscripcionId.value;
        const cuotaId = this.selectionForm.controls.cuotaId.value;

        const inscripcion =
          alumno.inscripciones.find((i) => i.id === inscripcionId) ?? null;
        this.inscripcionDetalle.set(inscripcion);
        this.cursoInfo.set(inscripcion?.curso ?? null);

        const cuota =
          inscripcion?.cuotas.find((c) => c.id === cuotaId) ?? null;
        this.cuota.set(cuota);
        this.pagos.set(cuota?.pagos ?? []);
        this.updateMontoValidator();
      },
      error: () => {
        // Si falla el refresh, los datos del pago igualmente se registraron
      }
    });
  }

  private extractErrorMessage(err: unknown): string {
    const httpError = err as { error?: { message?: string | string[] } };
    const message = httpError.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return 'No se pudo registrar el pago.';
  }
}
