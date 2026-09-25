import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CursosService } from '../../../services/cursos.service';
import { CursoConDetalle } from '../../../models/curso.model';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-cursos-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatMonedaPipe, LoadingState, ErrorState],
  templateUrl: './cursos-list.html',
  styleUrl: './cursos-list.css'
})
export class CursosList implements OnInit {
  cursos = signal<CursoConDetalle[]>([]);
  loading = signal(false);
  error = signal('');

  constructor(private readonly cursosService: CursosService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    this.cursosService.getAll().subscribe({
      next: (cursos) => {
        this.cursos.set(cursos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el listado de cursos.');
        this.loading.set(false);
      }
    });
  }
}
