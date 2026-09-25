import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CursosService } from '../../../services/cursos.service';
import { ProfesorasService } from '../../../services/profesoras.service';
import { CreateCursoRequest } from '../../../models/curso.model';
import { DiaSemana } from '../../../models/horario-curso.model';
import { Profesora } from '../../../models/profesora.model';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

const HORA_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function crearHorarioGroup(): FormGroup {
  return new FormGroup({
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
}

@Component({
  selector: 'app-curso-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LoadingState, ErrorState],
  templateUrl: './curso-create.html',
  styleUrl: './curso-create.css'
})
export class CursoCreate implements OnInit {
  readonly diasSemana: DiaSemana[] = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO'
  ];

  profesoras = signal<Profesora[]>([]);
  loadingProfesoras = signal(true);
  loadError = signal('');
  submitting = signal(false);
  submitError = signal('');

  // Campos según CreateCursoDto del backend (requiere al menos 1 horario)
  readonly form = new FormGroup({
    nombre: new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    precioMensual: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    precioMatricula: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    profesoraId: new FormControl<number | null>(null, Validators.required),
    horarios: new FormArray([crearHorarioGroup()])
  });

  get horarios(): FormArray {
    return this.form.controls.horarios;
  }

  constructor(
    private readonly cursosService: CursosService,
    private readonly profesorasService: ProfesorasService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadingProfesoras.set(true);
    this.loadError.set('');

    this.profesorasService.getAll().subscribe({
      next: (profesoras) => {
        this.profesoras.set(profesoras);
        this.loadingProfesoras.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo obtener el listado de profesoras.');
        this.loadingProfesoras.set(false);
      }
    });
  }

  addHorario(): void {
    this.horarios.push(crearHorarioGroup());
  }

  removeHorario(index: number): void {
    if (this.horarios.length > 1) {
      this.horarios.removeAt(index);
    }
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

    const payload: CreateCursoRequest = {
      nombre: raw.nombre as string,
      precioMensual: raw.precioMensual as number,
      precioMatricula: raw.precioMatricula as number,
      profesoraId: raw.profesoraId as number,
      horarios: raw.horarios.map((h) => ({
        diaSemana: h['diaSemana'] as DiaSemana,
        horaInicio: h['horaInicio'] as string,
        horaFin: h['horaFin'] as string
      }))
    };

    this.submitting.set(true);
    this.submitError.set('');

    this.cursosService.create(payload).subscribe({
      next: (curso) => {
        this.submitting.set(false);
        this.router.navigate(['/cursos', curso.id]);
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

    return 'No se pudo crear el curso.';
  }
}
