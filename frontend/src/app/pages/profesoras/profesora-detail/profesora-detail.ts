import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProfesorasService } from '../../../services/profesoras.service';
import { Profesora } from '../../../models/profesora.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

@Component({
  selector: 'app-profesora-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, LoadingState, ErrorState],
  templateUrl: './profesora-detail.html',
  styleUrl: './profesora-detail.css'
})
export class ProfesoraDetail implements OnInit {
  profesora = signal<Profesora | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly profesorasService: ProfesorasService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.loading.set(true);
    this.error.set('');

    this.profesorasService.getById(id).subscribe({
      next: (profesora) => {
        this.profesora.set(profesora);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener la información de la profesora.');
        this.loading.set(false);
      }
    });
  }
}
