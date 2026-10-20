import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AlumnosService } from '../../../services/alumnos.service';
import { CursosService } from '../../../services/cursos.service';
import { InscripcionesService } from '../../../services/inscripciones.service';
import { Alumno } from '../../../models/alumno.model';
import { CursoConDetalle } from '../../../models/curso.model';
import { CreateInscripcionRequest } from '../../../models/inscripcion.model';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-inscripcion-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormatMonedaPipe, LoadingState, ErrorState],
  templateUrl: './inscripcion-create.html',
  styleUrl: './inscripcion-create.css'
})
export class InscripcionCreate implements OnInit {
  alumnos = signal<Alumno[]>([]);
  cursos = signal<CursoConDetalle[]>([]);
  loadingData = signal(true);
  loadError = signal('');
  submitting = signal(false);
  submitError = signal('');
  successMessage = signal('');

  readonly mesesInicio = [
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Campos según CreateInscripcionDto del backend.
  // Nota: el control se llama "anio" (no "año") porque el lexer de templates
  // de Angular solo admite identificadores ASCII; el payload sí usa "año".
  readonly form = new FormGroup({
    alumnoId: new FormControl<number | null>(null, Validators.required),
    cursoId: new FormControl<number | null>(null, Validators.required),
    anio: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(2000),
      Validators.max(2100)
    ]),
    mesInicio: new FormControl<number | null>(null, [
      Validators.required,
      Validators.pattern(/^(?:[3-9]|1[0-2])$/)
    ]),
    descuentoPorcentaje: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(100)
    ])
  });

  constructor(
    private readonly alumnosService: AlumnosService,
    private readonly cursosService: CursosService,
    private readonly inscripcionesService: InscripcionesService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadingData.set(true);
    this.loadError.set('');

    forkJoin({
      alumnos: this.alumnosService.getAll(),
      cursos: this.cursosService.getAll()
    }).subscribe({
      next: ({ alumnos, cursos }) => {
        this.alumnos.set(alumnos);
        this.cursos.set(cursos);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadError.set(
          'No se pudieron cargar los alumnos y cursos necesarios.'
        );
        this.loadingData.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreateInscripcionRequest = {
      alumnoId: Number(raw.alumnoId),
      cursoId: Number(raw.cursoId),
      año: Number(raw.anio),
      mesInicio: Number(raw.mesInicio)
    };

    if (raw.descuentoPorcentaje !== null && raw.descuentoPorcentaje !== undefined) {
      payload.descuentoPorcentaje = Number(raw.descuentoPorcentaje);
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.successMessage.set('');

    this.inscripcionesService.create(payload).subscribe({
      next: (inscripcion) => {
        this.submitting.set(false);
        this.successMessage.set(
          'Inscripción creada correctamente. Redirigiendo al detalle...'
        );
        setTimeout(() => {
          this.router.navigate(['/inscripciones', inscripcion.id]);
        }, 1000);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(this.extractErrorMessage(err));
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

    return 'No se pudo crear la inscripción.';
  }
}
