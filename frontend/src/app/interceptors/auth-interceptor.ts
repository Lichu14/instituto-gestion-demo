import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isTrustedApiRequest } from '../core/api-config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const trusted = isTrustedApiRequest(req.url);
  const token = trusted ? localStorage.getItem('access_token') : null;

  const request = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : trusted ? req : req.clone({ headers: req.headers.delete('Authorization') });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (trusted && error.status === 401) {
        localStorage.removeItem('access_token');
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
