import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  templateUrl: './error-state.html',
  styleUrl: './error-state.css'
})
export class ErrorState {
  @Input({ required: true }) message = '';
  @Input() retryLabel = 'Reintentar';
  @Output() retry = new EventEmitter<void>();
}
