import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CursosService } from '../../../services/cursos.service';
import { HorariosCursoService } from '../../../services/horarios-curso.service';
import { ProfesorasService } from '../../../services/profesoras.service';
import { InscripcionesService } from '../../../services/inscripciones.service';
import { CursoConDetalle, EstadoCurso, UpdateCursoRequest } from '../../../models/curso.model';
import {
  CreateHorarioCursoRequest,
  DiaSemana,
  HorarioCurso
} from '../../../models/horario-curso.model';
import { Profesora } from '../../../models/profesora.model';
import { InscripcionConAlumnoCurso } from '../../../models/inscripcion.model';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

const HORA_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

@Component({
  selector: 'app-curso-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormatMonedaPipe, LoadingState, ErrorState, ConfirmDialog],
  templateUrl: './curso-detail.html',
  styleUrl: './curso-detail.css'
})
export class CursoDetail implements OnInit {
  curso = signal<CursoConDetalle | null>(null);
  loading = signal(true);
  error = signal('');

  // Estado de la gestión de horarios
  readonly diasSemana: DiaSemana[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO'
  ];
  horarioEditandoId = signal<number | null>(null);
  horarioSubmitting = signal(false);
  horarioError = signal('');
  horarioSuccess = signal('');
  horarioDeletingId = signal<number | null>(null);
  horarioAEliminar = signal<HorarioCurso | null>(null);
  mostrarFormularioHorario = signal(false);

  // Estado de la edición de datos del curso (precios, estado, profesora)
  profesoras = signal<Profesora[]>([]);
  editandoCurso = signal(false);
  cursoSubmitting = signal(false);
  cursoError = signal('');
  cursoSuccess = signal('');
  cursoArchivadoPendiente = signal(false);
  private cursoPayloadPendiente: UpdateCursoRequest | null = null;

  // Alumnos inscriptos en el curso (GET /inscripciones filtrado client-side
  // por cursoId; no hay endpoint dedicado en el backend).
  inscripcionesCurso = signal<InscripcionConAlumnoCurso[]>([]);
  loadingInscripciones = signal(true);

  alumnosInscriptos = computed(() =>
    [...this.inscripcionesCurso()].sort(
      (a, b) =>
        a.alumno.apellido.localeCompare(b.alumno.apellido) ||
        a.alumno.nombre.localeCompare(b.alumno.nombre)
    )
  );

  cantidadAlumnosInscriptos = computed(() => this.alumnosInscriptos().length);

  // Resumen compacto de horarios para el encabezado (mismo formato "DIA HH:mm-HH:mm"
  // que ya usa la sección Horarios más abajo).
  horariosResumen = computed(() => {
    const curso = this.curso();
    if (!curso || curso.horarios.length === 0) {
      return 'Sin horarios cargados';
    }
    return curso.horarios.map((h) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`).join(' · ');
  });

  // Campos según UpdateCursoDto del backend (nombre no se edita por este formulario)
  readonly cursoForm = new FormGroup({
    precioMensual: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    precioMatricula: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    profesoraId: new FormControl<number | null>(null, Validators.required),
    estado: new FormControl<EstadoCurso>('ACTIVO', Validators.required)
  });

  // Campos según CreateHorarioCursoDto del backend (cursoId va en la URL)
  readonly horarioForm = new FormGroup({
    diaSemana: new FormControl<DiaSemana | null>(null, Validators.required),
    horaInicio: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(HORA_PATTERN)
    ]),
    horaFin: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(HORA_PATTERN)
    ])
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly cursosService: CursosService,
    private readonly horariosCursoService: HorariosCursoService,
    private readonly profesorasService: ProfesorasService,
    private readonly inscripcionesService: InscripcionesService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCurso(id);
    this.profesorasService.getAll().subscribe({
      next: (profesoras) => this.profesoras.set(profesoras)
    });
    this.loadInscripciones(id);
  }

  private loadCurso(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.cursosService.getById(id).subscribe({
      next: (curso) => {
        this.curso.set(curso);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener la información del curso.');
        this.loading.set(false);
      }
    });
  }

  private loadInscripciones(cursoId: number): void {
    this.loadingInscripciones.set(true);

    this.inscripcionesService.getAll().subscribe({
      next: (inscripciones) => {
        this.inscripcionesCurso.set(
          inscripciones.filter((inscripcion) => inscripcion.cursoId === cursoId)
        );
        this.loadingInscripciones.set(false);
      },
      error: () => {
        this.loadingInscripciones.set(false);
      }
    });
  }

  startEditCurso(): void {
    const curso = this.curso();
    if (!curso) {
      return;
    }
    this.editandoCurso.set(true);
    this.cursoError.set('');
    this.cursoSuccess.set('');
    this.cursoForm.setValue({
      precioMensual: Number(curso.precioMensual),
      precioMatricula: Number(curso.precioMatricula),
      profesoraId: curso.profesoraId,
      estado: curso.estado
    });
  }

  cancelEditCurso(): void {
    this.editandoCurso.set(false);
    this.cursoError.set('');
  }

  onSubmitCurso(): void {
    const curso = this.curso();
    if (!curso || this.cursoSubmitting()) {
      return;
    }

    if (this.cursoForm.invalid) {
      this.cursoForm.markAllAsTouched();
      return;
    }

    const raw = this.cursoForm.getRawValue();
    const payload: UpdateCursoRequest = {
      precioMensual: raw.precioMensual as number,
      precioMatricula: raw.precioMatricula as number,
      profesoraId: raw.profesoraId as number,
      estado: raw.estado as EstadoCurso
    };

    if (payload.estado === 'ARCHIVADO' && curso.estado !== 'ARCHIVADO') {
      this.cursoPayloadPendiente = payload;
      this.cursoArchivadoPendiente.set(true);
      return;
    }

    this.guardarCurso(curso, payload);
  }

  confirmarArchivadoCurso(): void {
    const curso = this.curso();
    const payload = this.cursoPayloadPendiente;
    this.cursoPayloadPendiente = null;
    this.cursoArchivadoPendiente.set(false);
    if (curso && payload) {
      this.guardarCurso(curso, payload);
    }
  }

  cancelarArchivadoCurso(): void {
    this.cursoPayloadPendiente = null;
    this.cursoArchivadoPendiente.set(false);
  }

  private guardarCurso(curso: CursoConDetalle, payload: UpdateCursoRequest): void {

    this.cursoSubmitting.set(true);
    this.cursoError.set('');
    this.cursoSuccess.set('');

    this.cursosService.update(curso.id, payload).subscribe({
      next: (cursoActualizado) => {
        this.cursoSubmitting.set(false);
        this.cursoSuccess.set('Curso actualizado correctamente.');
        this.curso.set(cursoActualizado);
        this.editandoCurso.set(false);
      },
      error: (err) => {
        this.cursoSubmitting.set(false);
        this.cursoError.set(this.extractErrorMessage(err));
      }
    });
  }

  showAddHorarioForm(): void {
    this.horarioEditandoId.set(null);
    this.horarioForm.reset({ diaSemana: null, horaInicio: '', horaFin: '' });
    this.horarioError.set('');
    this.horarioSuccess.set('');
    this.mostrarFormularioHorario.set(true);
  }

  startEditHorario(horario: HorarioCurso): void {
    this.horarioEditandoId.set(horario.id);
    this.horarioError.set('');
    this.horarioSuccess.set('');
    this.horarioForm.setValue({
      diaSemana: horario.diaSemana,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin
    });
    this.mostrarFormularioHorario.set(true);
  }

  cancelEditHorario(): void {
    this.horarioEditandoId.set(null);
    this.horarioForm.reset({ diaSemana: null, horaInicio: '', horaFin: '' });
    this.horarioError.set('');
    this.mostrarFormularioHorario.set(false);
  }

  onSubmitHorario(): void {
    const curso = this.curso();
    if (!curso || this.horarioSubmitting()) {
      return;
    }

    if (this.horarioForm.invalid) {
      this.horarioForm.markAllAsTouched();
      return;
    }

    const raw = this.horarioForm.getRawValue();
    const payload: CreateHorarioCursoRequest = {
      diaSemana: raw.diaSemana as DiaSemana,
      horaInicio: raw.horaInicio as string,
      horaFin: raw.horaFin as string
    };

    this.horarioSubmitting.set(true);
    this.horarioError.set('');
    this.horarioSuccess.set('');

    const editandoId = this.horarioEditandoId();
    const operacion =
      editandoId === null
        ? this.horariosCursoService.create(curso.id, payload)
        : this.horariosCursoService.update(curso.id, editandoId, payload);

    operacion.subscribe({
      next: () => {
        this.horarioSubmitting.set(false);
        this.horarioSuccess.set(
          editandoId === null
            ? 'Horario agregado correctamente.'
            : 'Horario actualizado correctamente.'
        );
        this.cancelEditHorario();
        // Refresca el curso para mostrar los horarios actualizados
        this.loadCurso(curso.id);
      },
      error: (err) => {
        this.horarioSubmitting.set(false);
        this.horarioError.set(this.extractErrorMessage(err));
      }
    });
  }

  onDeleteHorario(horario: HorarioCurso): void {
    const curso = this.curso();
    if (!curso || this.horarioDeletingId() !== null) {
      return;
    }

    this.horarioAEliminar.set(horario);
  }

  confirmarEliminarHorario(): void {
    const horario = this.horarioAEliminar();
    this.horarioAEliminar.set(null);
    if (horario) {
      this.eliminarHorario(horario);
    }
  }

  cancelarEliminarHorario(): void {
    this.horarioAEliminar.set(null);
  }

  private eliminarHorario(horario: HorarioCurso): void {
    const curso = this.curso();
    if (!curso) {
      return;
    }

    this.horarioDeletingId.set(horario.id);
    this.horarioError.set('');
    this.horarioSuccess.set('');

    this.horariosCursoService.delete(curso.id, horario.id).subscribe({
      next: () => {
        this.horarioDeletingId.set(null);
        this.horarioSuccess.set('Horario eliminado correctamente.');
        this.loadCurso(curso.id);
      },
      error: (err) => {
        this.horarioDeletingId.set(null);
        this.horarioError.set(this.extractErrorMessage(err));
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

    return 'No se pudo completar la operación con el horario.';
  }
}
