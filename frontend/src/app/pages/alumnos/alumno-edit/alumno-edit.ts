import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AlumnosService } from '../../../services/alumnos.service';
import { EstadoAlumno, UpdateAlumnoRequest } from '../../../models/alumno.model';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-alumno-edit',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LoadingState, ErrorState],
  templateUrl: './alumno-edit.html',
  styleUrl: './alumno-edit.css'
})
export class AlumnoEdit implements OnInit {
  alumnoId!: number;
  nombreCompleto = signal('');
  loading = signal(true);
  loadError = signal('');
  submitting = signal(false);
  submitError = signal('');

  // Campos según UpdateAlumnoDto del backend (nombre/apellido no son editables por este formulario).
  readonly form = new FormGroup({
    dni: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(/^\d{7,8}$/)
    ]),
    fechaNacimiento: new FormControl<string>('', Validators.required),
    telefono: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(/^\d{6,15}$/)
    ]),
    email: new FormControl<string>('', Validators.email),
    estado: new FormControl<EstadoAlumno>('ACTIVO', Validators.required),
    fechaAlta: new FormControl<string>('', Validators.required)
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly alumnosService: AlumnosService
  ) {}

  ngOnInit(): void {
    this.alumnoId = Number(this.route.snapshot.paramMap.get('id'));

    this.loading.set(true);
    this.loadError.set('');

    this.alumnosService.getById(this.alumnoId).subscribe({
      next: (alumno) => {
        this.nombreCompleto.set(`${alumno.nombre} ${alumno.apellido}`);
        this.form.patchValue({
          dni: alumno.dni,
          fechaNacimiento: this.toDateInputValue(alumno.fechaNacimiento),
          telefono: alumno.telefono,
          email: alumno.email ?? '',
          estado: alumno.estado,
          fechaAlta: this.toDateInputValue(alumno.fechaAlta)
        });
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('No se pudo obtener la información del alumno.');
        this.loading.set(false);
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

    const payload: UpdateAlumnoRequest = {
      dni: raw.dni as string,
      fechaNacimiento: raw.fechaNacimiento as string,
      telefono: raw.telefono as string,
      email: raw.email || undefined,
      estado: raw.estado as EstadoAlumno,
      fechaAlta: raw.fechaAlta as string
    };

    this.submitting.set(true);
    this.submitError.set('');

    this.alumnosService.update(this.alumnoId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/alumnos', this.alumnoId]);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(this.extractErrorMessage(err));
      }
    });
  }

  // Convierte una fecha ISO recibida del backend a formato yyyy-MM-dd para <input type="date">.
  private toDateInputValue(value: string): string {
    return value ? value.slice(0, 10) : '';
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

    return 'No se pudo actualizar el alumno.';
  }
}
