import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AlumnosService } from '../../services/alumnos.service';
import { CursosService } from '../../services/cursos.service';
import { InscripcionesService } from '../../services/inscripciones.service';
import { CuotasService } from '../../services/cuotas.service';
import { PagosService } from '../../services/pagos.service';
import { Alumno } from '../../models/alumno.model';
import { CursoConDetalle } from '../../models/curso.model';
import { InscripcionConAlumnoCurso } from '../../models/inscripcion.model';
import { CuotaConDetalle } from '../../models/cuota.model';
import { PagoConDetalle } from '../../models/pago.model';
import { FormatFechaPipe } from '../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../shared/pipes/format-moneda.pipe';
import { LoadingState } from '../../shared/loading-state/loading-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { agruparPagosPorCuota, esPeriodoActual, esDeudaActual } from '../../shared/utils/cuotas.utils';

/**
 * Dashboard/Inicio. Resumen general armado a partir de los mismos servicios
 * que usan Alumnos, Cursos, Inscripciones, Cuotas y Pagos: no hay endpoint
 * ni entidad propia, solo lectura y agregación en el cliente.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  alumnos = signal<Alumno[]>([]);
  cursos = signal<CursoConDetalle[]>([]);
  inscripciones = signal<InscripcionConAlumnoCurso[]>([]);
  cuotas = signal<CuotaConDetalle[]>([]);
  pagos = signal<PagoConDetalle[]>([]);

  loading = signal(false);
  error = signal('');

  // Pagos agrupados por cuotaId: monto total pagado por cuota (solo
  // CONFIRMADOS; misma regla que usa Cuotas, ver cuotas.utils.ts).
  private pagosPorCuota = computed(() => agruparPagosPorCuota(this.pagos()));

  alumnosActivos = computed(
    () => this.alumnos().filter((a) => a.estado === 'ACTIVO').length
  );

  cursosActivos = computed(
    () => this.cursos().filter((c) => c.estado === 'ACTIVO').length
  );

  inscripcionesActivas = computed(
    () => this.inscripciones().filter((i) => i.estado === 'ACTIVA').length
  );

  // "Pendiente" (mes actual): saldo de cuotas PENDIENTE/PAGO_PARCIAL cuyo
  // período es el mes/año calendario actual. Las cuotas de meses futuros no
  // son deuda todavía, aunque ya existan generadas; las VENCIDA se excluyen
  // acá para no contarlas dos veces (van en "vencido").
  pendienteMesActual = computed(() => {
    const hoy = new Date();
    return this.cuotas()
      .filter(
        (c) => (c.estado === 'PENDIENTE' || c.estado === 'PAGO_PARCIAL') && esPeriodoActual(c, hoy)
      )
      .reduce((acc, cuota) => acc + this.saldo(cuota), 0);
  });

  cobradoEsteMes = computed(() => {
    const ahora = new Date();
    return this.pagos()
      .filter((p) => p.estado === 'CONFIRMADO' && this.esMismoMes(p.fechaPago, ahora))
      .reduce((acc, p) => acc + Number(p.monto), 0);
  });

  // "Vencido" = saldo pendiente de las cuotas cuyo estado actual es VENCIDA
  // (recalculado en CuotasService.getAll() vía actualizarEstadoCuota).
  vencido = computed(() =>
    this.cuotas()
      .filter((c) => c.estado === 'VENCIDA')
      .reduce((acc, cuota) => acc + this.saldo(cuota), 0)
  );

  // Deuda que corresponde cobrar hoy: vencidas + mes actual (ver esDeudaActual
  // en cuotas.utils.ts; mismo criterio que "Total pendiente" sin filtros en Cuotas).
  pendienteCobro = computed(() =>
    this.cuotas()
      .filter((c) => esDeudaActual(c))
      .reduce((acc, cuota) => acc + this.saldo(cuota), 0)
  );

  cuotasVencidas = computed(() => this.cuotas().filter((c) => c.estado === 'VENCIDA'));

  proximosVencimientos = computed(() =>
    [...this.cuotas()]
      .filter((c) => c.estado === 'PENDIENTE' || c.estado === 'PAGO_PARCIAL')
      .sort(
        (a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
      )
      .slice(0, 5)
  );

  ultimosPagos = computed(() =>
    [...this.pagos()]
      .filter((p) => p.estado === 'CONFIRMADO')
      .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
      .slice(0, 5)
  );

  ultimasInscripciones = computed(() =>
    [...this.inscripciones()]
      .sort(
        (a, b) => new Date(b.fechaInscripcion).getTime() - new Date(a.fechaInscripcion).getTime()
      )
      .slice(0, 5)
  );

  constructor(
    private readonly alumnosService: AlumnosService,
    private readonly cursosService: CursosService,
    private readonly inscripcionesService: InscripcionesService,
    private readonly cuotasService: CuotasService,
    private readonly pagosService: PagosService
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      alumnos: this.alumnosService.getAll(),
      cursos: this.cursosService.getAll(),
      inscripciones: this.inscripcionesService.getAll(),
      cuotas: this.cuotasService.getAll(),
      pagos: this.pagosService.getAll()
    }).subscribe({
      next: ({ alumnos, cursos, inscripciones, cuotas, pagos }) => {
        this.alumnos.set(alumnos);
        this.cursos.set(cursos);
        this.inscripciones.set(inscripciones);
        this.cuotas.set(cuotas);
        this.pagos.set(pagos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener la información del dashboard.');
        this.loading.set(false);
      }
    });
  }

  // Cálculo puramente visual: monto - pagos realizados (mismo criterio que Cuotas)
  saldo(cuota: CuotaConDetalle): number {
    return Number(cuota.monto) - (this.pagosPorCuota().get(cuota.id) ?? 0);
  }

  private esMismoMes(fechaIso: string, ahora: Date): boolean {
    const fecha = new Date(fechaIso);
    return (
      fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth()
    );
  }
}
