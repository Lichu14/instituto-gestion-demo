import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AlumnosService } from '../../../services/alumnos.service';
import { Alumno } from '../../../models/alumno.model';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-alumnos-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingState, ErrorState, ConfirmDialog],
  templateUrl: './alumnos-list.html',
  styleUrl: './alumnos-list.css'
})
export class AlumnosList implements OnInit {
  alumnos = signal<Alumno[]>([]);
  searchTerm = signal('');
  showArchived = signal(false);
  loading = signal(false);
  error = signal('');
  updatingId = signal<number | null>(null);
  alumnoAArchivar = signal<Alumno | null>(null);

  // Búsqueda global en frontend sobre los datos ya recibidos.
  // Sin selector de criterio: coincide con nombre, apellido, DNI, etc.
  filteredAlumnos = computed(() => {
    const term = this.normalize(this.searchTerm());

    return this.alumnos().filter((alumno) => {
      if (!this.showArchived() && alumno.estado === 'ARCHIVADO') {
        return false;
      }

      if (!term) {
        return true;
      }

      const campos = [
        alumno.nombre,
        alumno.apellido,
        `${alumno.nombre} ${alumno.apellido}`,
        `${alumno.apellido} ${alumno.nombre}`,
        alumno.dni,
        alumno.telefono,
        alumno.email ?? ''
      ];

      return campos.some((campo) => this.normalize(campo).includes(term));
    });
  });

  constructor(private readonly alumnosService: AlumnosService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    this.alumnosService.getAll().subscribe({
      next: (alumnos) => {
        this.alumnos.set(alumnos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el listado de alumnos.');
        this.loading.set(false);
      }
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onToggleArchived(event: Event): void {
    this.showArchived.set((event.target as HTMLInputElement).checked);
  }

  toggleEstado(alumno: Alumno): void {
    if (this.updatingId() !== null) {
      return;
    }

    const nuevoEstado = alumno.estado === 'ACTIVO' ? 'ARCHIVADO' : 'ACTIVO';

    if (nuevoEstado === 'ARCHIVADO') {
      this.alumnoAArchivar.set(alumno);
      return;
    }

    this.updateEstado(alumno, nuevoEstado);
  }

  confirmarArchivado(): void {
    const alumno = this.alumnoAArchivar();
    if (alumno) {
      this.alumnoAArchivar.set(null);
      this.updateEstado(alumno, 'ARCHIVADO');
    }
  }

  cancelarArchivado(): void {
    this.alumnoAArchivar.set(null);
  }

  private updateEstado(alumno: Alumno, nuevoEstado: 'ACTIVO' | 'ARCHIVADO'): void {

    this.updatingId.set(alumno.id);

    this.alumnosService.update(alumno.id, { estado: nuevoEstado }).subscribe({
      next: (actualizado) => {
        this.alumnos.update((lista) =>
          lista.map((a) => (a.id === actualizado.id ? actualizado : a))
        );
        this.updatingId.set(null);
      },
      error: () => {
        this.error.set('No se pudo actualizar el estado del alumno.');
        this.updatingId.set(null);
      }
    });
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
