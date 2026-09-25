import { Component, Input, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { PagosService } from '../../services/pagos.service';

@Component({
  selector: 'app-comprobante-pago',
  standalone: true,
  template: `
    <button type="button" (click)="descargar()" [disabled]="descargando()"
      [attr.aria-busy]="descargando()" [attr.aria-label]="'Descargar comprobante del pago ' + pagoId">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
        <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ descargando() ? 'Generando PDF...' : 'Descargar comprobante' }}
    </button>
    @if (error()) { <p role="alert">{{ error() }}</p> }
  `,
  styles: `
    :host { display: block; min-width: 0; max-width: 100%; }
    button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
      min-height: 2.25rem; max-width: 100%; margin: 0; padding: .4rem .6rem;
      border: 1px solid var(--color-border); border-radius: var(--radius-md);
      background: transparent; color: var(--color-primary); box-shadow: none;
      font: inherit; font-size: .75rem; font-weight: 600; line-height: 1.4;
      text-align: left; cursor: pointer; }
    button:hover:not(:disabled) { background: var(--color-surface-alt); transform: none; }
    button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
    button:disabled { cursor: wait; opacity: .65; }
    svg { width: 1rem; height: 1rem; flex-shrink: 0; }
    p { max-width: 20rem; margin: .35rem 0 0; color: var(--color-danger, #a33b32);
      font-size: .75rem; line-height: 1.5; }
  `,
})
export class ComprobantePago {
  @Input({ required: true }) pagoId!: number;
  private readonly pagos = inject(PagosService);
  readonly descargando = signal(false);
  readonly error = signal('');

  descargar(): void {
    if (this.descargando()) return;
    this.error.set('');
    this.descargando.set(true);
    const mensajeError = 'No se pudo descargar el comprobante. Intentá nuevamente.';
    this.pagos.descargarComprobante(this.pagoId)
      .pipe(finalize(() => this.descargando.set(false)))
      .subscribe({
        next: (response) => {
          let url: string | undefined;
          try {
            if (!response.body) throw new Error('PDF vacío');
            const filename = response.headers.get('Content-Disposition')
              ?.match(/filename="([a-zA-Z0-9-]+\.pdf)"/)?.[1]
              || `comprobante-pago-${this.pagoId}.pdf`;
            url = URL.createObjectURL(response.body);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            try { link.click(); } finally { link.remove(); }
          } catch {
            this.error.set(mensajeError);
          } finally {
            if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
          }
        },
        error: () => this.error.set(mensajeError),
      });
  }
}
