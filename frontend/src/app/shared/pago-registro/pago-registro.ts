import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pago } from '../../models/pago.model';
import { FormatFechaPipe } from '../pipes/format-fecha.pipe';

@Component({
  selector: 'app-pago-registro',
  standalone: true,
  imports: [CommonModule, FormatFechaPipe],
  template: `
    <ng-container *ngIf="pago.fechaRegistro || pago.usuarioRegistro; else historico">
      <span>Registrado por: <strong>{{ pago.usuarioRegistro?.nombre || 'No disponible' }}</strong></span>
      <span *ngIf="pago.fechaRegistro" aria-hidden="true">·</span>
      <time *ngIf="pago.fechaRegistro" [attr.datetime]="pago.fechaRegistro"
        title="Fecha y hora de registro">{{ pago.fechaRegistro | formatFecha:'time' }}</time>
      <span *ngIf="!pago.fechaRegistro">· Fecha de registro no disponible</span>
    </ng-container>
    <ng-template #historico>Registro anterior a la auditoría</ng-template>
  `,
  styles: `
    :host { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .35rem;
      min-width: 0; color: var(--color-text-muted); font-size: .72rem; line-height: 1.5;
      overflow-wrap: anywhere; }
    strong { font-weight: 600; }
    time { font-variant-numeric: tabular-nums; }
  `,
})
export class PagoRegistro {
  @Input({ required: true }) pago!: Pick<Pago, 'fechaRegistro' | 'usuarioRegistro'>;
}
