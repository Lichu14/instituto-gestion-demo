import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InscripcionesService } from '../../../services/inscripciones.service';
import { InscripcionConAlumnoCurso } from '../../../models/inscripcion.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-inscripciones-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, LoadingState, ErrorState],
  templateUrl: './inscripciones-list.html',
  styleUrl: './inscripciones-list.css'
})
export class InscripcionesList implements OnInit {
  inscripciones = signal<InscripcionConAlumnoCurso[]>([]);
  searchTerm = signal('');
  showAbandonadas = signal(false);
  loading = signal(false);
  error = signal('');

  // Búsqueda global en frontend sobre los datos ya recibidos (alumno + curso
  // vienen incluidos en GET /inscripciones). Sin selector de criterio.
  filteredInscripciones = computed(() => {
    const term = this.normalize(this.searchTerm());

    return this.inscripciones().filter((inscripcion) => {
      if (!this.showAbandonadas() && inscripcion.estado === 'ABANDONADA') {
        return false;
      }

      if (!term) {
        return true;
      }

      const alumno = inscripcion.alumno;
      const campos = [
        alumno.nombre,
        alumno.apellido,
        `${alumno.nombre} ${alumno.apellido}`,
        `${alumno.apellido} ${alumno.nombre}`,
        alumno.dni,
        alumno.telefono,
        alumno.email ?? '',
        inscripcion.curso.nombre,
        String(inscripcion.año),
        inscripcion.estado
      ];

      return campos.some((campo) => this.normalize(campo).includes(term));
    });
  });

  constructor(private readonly inscripcionesService: InscripcionesService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    this.inscripcionesService.getAll().subscribe({
      next: (inscripciones) => {
        this.inscripciones.set(inscripciones);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el listado de inscripciones.');
        this.loading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onToggleAbandonadas(event: Event): void {
    this.showAbandonadas.set((event.target as HTMLInputElement).checked);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
