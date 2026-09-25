import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfesorasService } from '../../../services/profesoras.service';
import { Profesora } from '../../../models/profesora.model';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-profesoras-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingState, ErrorState],
  templateUrl: './profesoras-list.html',
  styleUrl: './profesoras-list.css'
})
export class ProfesorasList implements OnInit {
  profesoras = signal<Profesora[]>([]);
  showInactive = signal(false);
  loading = signal(false);
  error = signal('');

  // Filtro de presentación: por defecto solo ACTIVA; con el checkbox,
  // activas e inactivas. Los datos del backend nunca se modifican.
  filteredProfesoras = computed(() => {
    if (this.showInactive()) {
      return this.profesoras();
    }
    return this.profesoras().filter(
      (profesora) => profesora.estado === 'ACTIVA'
    );
  });

  constructor(private readonly profesorasService: ProfesorasService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    this.profesorasService.getAll().subscribe({
      next: (profesoras) => {
        this.profesoras.set(profesoras);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el listado de profesoras.');
        this.loading.set(false);
      }
    });
  }

  onToggleInactive(event: Event): void {
    this.showInactive.set((event.target as HTMLInputElement).checked);
  }
}
