import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { AlumnosService } from '../../../services/alumnos.service';
import { Alumno, CreateAlumnoRequest } from '../../../models/alumno.model';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-alumno-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, ErrorState],
  templateUrl: './alumno-create.html',
  styleUrl: './alumno-create.css'
})
export class AlumnoCreate {
  submitting = signal(false);
  submitError = signal('');
  successMessage = signal('');
  createdAlumno = signal<Alumno | null>(null);

  // Campos según CreateAlumnoDto del backend.
  // "estado" no se envía: el backend lo fija en ACTIVO por defecto.
  readonly form = new FormGroup({
    nombre: new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    apellido: new FormControl<string>('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    dni: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(/^\d{7,8}$/)
    ]),
    fechaNacimiento: new FormControl<string>('', Validators.required),
    telefono: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(/^\d{6,15}$/)
    ]),
    email: new FormControl<string>('', Validators.email)
  });

  constructor(
    private readonly alumnosService: AlumnosService,
    private readonly router: Router
  ) {}

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreateAlumnoRequest = {
      nombre: raw.nombre as string,
      apellido: raw.apellido as string,
      dni: raw.dni as string,
      fechaNacimiento: raw.fechaNacimiento as string,
      telefono: raw.telefono as string
    };

    if (raw.email) {
      payload.email = raw.email;
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.successMessage.set('');
    this.createdAlumno.set(null);

    this.alumnosService.create(payload).subscribe({
      next: (alumno) => {
        this.submitting.set(false);
        this.createdAlumno.set(alumno);
        this.successMessage.set(
          'Alumno creado correctamente. Redirigiendo al detalle...'
        );
        setTimeout(() => {
          this.router.navigate(['/alumnos', alumno.id]);
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

    return 'No se pudo crear el alumno.';
  }
}
