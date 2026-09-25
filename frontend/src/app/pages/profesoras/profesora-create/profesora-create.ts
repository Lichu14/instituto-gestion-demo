import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ProfesorasService } from '../../../services/profesoras.service';
import { CreateProfesoraRequest } from '../../../models/profesora.model';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-profesora-create',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, ErrorState],
  templateUrl: './profesora-create.html',
  styleUrl: './profesora-create.css'
})
export class ProfesoraCreate {
  submitting = signal(false);
  submitError = signal('');
  successMessage = signal('');

  // Campos según CreateProfesoraDto del backend
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
    telefono: new FormControl<string>('', [
      Validators.required,
      Validators.pattern(/^\d{6,15}$/)
    ]),
    email: new FormControl<string>('', Validators.email),
    fechaIngreso: new FormControl<string>('', Validators.required)
  });

  constructor(
    private readonly profesorasService: ProfesorasService,
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

    const payload: CreateProfesoraRequest = {
      nombre: raw.nombre as string,
      apellido: raw.apellido as string,
      dni: raw.dni as string,
      telefono: raw.telefono as string,
      fechaIngreso: raw.fechaIngreso as string
    };

    if (raw.email) {
      payload.email = raw.email;
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.successMessage.set('');

    this.profesorasService.create(payload).subscribe({
      next: (profesora) => {
        this.submitting.set(false);
        this.successMessage.set(
          'Profesora creada correctamente. Redirigiendo al detalle...'
        );
        setTimeout(() => {
          this.router.navigate(['/profesoras', profesora.id]);
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

    return 'No se pudo crear la profesora.';
  }
}
