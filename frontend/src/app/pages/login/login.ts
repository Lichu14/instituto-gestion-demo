import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = 'demo@example.invalid';
  password = 'DemoAcademia2026!';
  errorMessage = signal('');
  isLoading = signal(false);

  login(): void {
    this.errorMessage.set('');
    this.isLoading.set(true);

    this.authService
      .login(this.email, this.password)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          localStorage.setItem('access_token', response.access_token);
          this.router.navigate(['/']);

        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.status === 401
            ? 'Email o contraseña incorrectos.'
            : error.status === 429
              ? 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.'
              : 'No pudimos iniciar sesión. Intentá nuevamente.');
        },
      });
  }
}
