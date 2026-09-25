import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  templateUrl: './loading-state.html',
  styleUrl: './loading-state.css'
})
export class LoadingState {
  @Input({ required: true }) message = '';
  @Input() inline = false;
}
