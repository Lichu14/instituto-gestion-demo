import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CuotasService } from '../../../services/cuotas.service';
import { PagosService } from '../../../services/pagos.service';
import { CuotaConDetalle, EstadoCuota } from '../../../models/cuota.model';
import { FormatFechaPipe } from '../../../shared/pipes/format-fecha.pipe';
import { FormatMonedaPipe } from '../../../shared/pipes/format-moneda.pipe';
import { sortCuotas, agruparPagosPorCuota, esDeudaActual } from '../../../shared/utils/cuotas.utils';
import { LoadingState } from '../../../shared/loading-state/loading-state';
import { ErrorState } from '../../../shared/error-state/error-state';

type EstadoFiltro = 'TODAS' | EstadoCuota;

const MESES = [
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

/**
 * Panel de cobranza. Las cuotas las genera el backend al crear inscripciones;
 * esta pantalla NO es un CRUD: sirve para consultar la situación, encontrar
 * quién debe dinero y acceder al registro de pagos.
 */
@Component({
  selector: 'app-cuotas-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormatFechaPipe, FormatMonedaPipe, LoadingState, ErrorState],
  templateUrl: './cuotas-list.html',
  styleUrl: './cuotas-list.css'
})
export class CuotasList implements OnInit {
  cuotas = signal<CuotaConDetalle[]>([]);
  // Pagos agrupados por cuotaId: monto total pagado por cuota (solo
  // pagos CONFIRMADOS; ver agruparPagosPorCuota en shared/utils/cuotas.utils.ts)
  pagosPorCuota = signal<Map<number, number>>(new Map());

  loading = signal(false);
  error = signal('');

  searchTerm = signal('');
  estadoFiltro = signal<EstadoFiltro>('TODAS');
  anioFiltro = signal<number | null>(null);
  periodoFiltro = signal<string | null>(null);
  cursoFiltro = signal<number | null>(null);

  readonly meses = MESES;
  readonly estados: { valor: EstadoFiltro; etiqueta: string }[] = [
    { valor: 'TODAS', etiqueta: 'Todas' },
    { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
    { valor: 'PAGO_PARCIAL', etiqueta: 'Pago parcial' },
    { valor: 'VENCIDA', etiqueta: 'Vencidas' },
    { valor: 'PAGADA', etiqueta: 'Pagadas' }
  ];

  // Opciones de filtros derivadas de los datos reales
  aniosDisponibles = computed(() => {
    const años = new Set<number>();
    for (const cuota of this.cuotas()) {
      años.add(cuota.inscripcion.año);
    }
    return [...años].sort((a, b) => a - b);
  });

  cursosDisponibles = computed(() => {
    const cursos = new Map<number, string>();
    for (const cuota of this.cuotas()) {
      cursos.set(cuota.inscripcion.curso.id, cuota.inscripcion.curso.nombre);
    }
    return [...cursos.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  filteredCuotas = computed(() => {
    const term = this.normalize(this.searchTerm());
    const estado = this.estadoFiltro();
    const anio = this.anioFiltro();
    const periodo = this.periodoFiltro();
    const cursoId = this.cursoFiltro();

    const filtradas = this.cuotas().filter((cuota) => {
      if (estado !== 'TODAS' && cuota.estado !== estado) {
        return false;
      }

      if (anio !== null && cuota.inscripcion.año !== anio) {
        return false;
      }

      if (periodo !== null) {
        if (periodo === 'MATRICULA') {
          if (cuota.concepto !== 'MATRICULA') {
            return false;
          }
        } else if (cuota.periodo !== periodo) {
          return false;
        }
      }

      if (cursoId !== null && cuota.inscripcion.curso.id !== cursoId) {
        return false;
      }

      if (!term) {
        return true;
      }

      const alumno = cuota.inscripcion.alumno;
      const campos = [
        alumno.nombre,
        alumno.apellido,
        `${alumno.nombre} ${alumno.apellido}`,
        `${alumno.apellido} ${alumno.nombre}`,
        alumno.dni,
        alumno.telefono,
        alumno.email ?? '',
        cuota.inscripcion.curso.nombre,
        cuota.periodo,
        String(cuota.inscripcion.año),
        cuota.concepto,
        cuota.estado
      ];

      return campos.some((campo) => this.normalize(campo).includes(term));
    });

    return sortCuotas(filtradas);
  });

  // Resumen de cobranza calculado sobre TODAS las cuotas (no sobre el filtro
  // activo): representa la situación global del instituto.
  cantidadPendientes = computed(
    () => this.cuotas().filter((c) => c.estado === 'PENDIENTE').length
  );

  cantidadPagoParcial = computed(
    () => this.cuotas().filter((c) => c.estado === 'PAGO_PARCIAL').length
  );

  cantidadVencidas = computed(
    () => this.cuotas().filter((c) => c.estado === 'VENCIDA').length
  );

  // Total pendiente: sin filtros representa la deuda actual (vencidas +
  // pendientes/pago parcial del mes en curso, ver esDeudaActual). Con
  // filtros activos se respeta el criterio anterior (saldo de lo filtrado,
  // sin importar el período), para que el usuario pueda consultar el
  // pendiente de cualquier mes/curso/año que elija explícitamente.
  totalPendiente = computed(() => {
    const cuotas = this.filteredCuotas();

    if (!this.hayFiltrosActivos()) {
      return cuotas
        .filter((c) => esDeudaActual(c))
        .reduce((acc, cuota) => acc + this.saldo(cuota), 0);
    }

    return cuotas
      .filter((c) => c.estado !== 'PAGADA' && c.estado !== 'ANULADA')
      .reduce((acc, cuota) => acc + this.saldo(cuota), 0);
  });

  hayFiltrosActivos = computed(
    () =>
      this.estadoFiltro() !== 'TODAS' ||
      this.anioFiltro() !== null ||
      this.periodoFiltro() !== null ||
      this.cursoFiltro() !== null ||
      this.searchTerm().trim() !== ''
  );

  tituloTotalPendiente = computed(() =>
    this.hayFiltrosActivos() ? 'Pendiente según filtros' : 'Total pendiente'
  );

  resumenFiltrosActivos = computed(() => {
    if (!this.hayFiltrosActivos()) {
      return '';
    }

    const partes: string[] = [];

    const estado = this.estadoFiltro();
    if (estado !== 'TODAS') {
      const etiqueta = this.estados.find((e) => e.valor === estado)?.etiqueta;
      if (etiqueta) {
        partes.push(etiqueta);
      }
    }

    const anio = this.anioFiltro();
    if (anio !== null) {
      partes.push(String(anio));
    }

    const periodo = this.periodoFiltro();
    if (periodo !== null) {
      partes.push(periodo === 'MATRICULA' ? 'Matrícula' : periodo);
    }

    const cursoId = this.cursoFiltro();
    if (cursoId !== null) {
      const curso = this.cursosDisponibles().find((c) => c.id === cursoId);
      if (curso) {
        partes.push(curso.nombre);
      }
    }

    const term = this.searchTerm().trim();
    if (term !== '') {
      partes.push(`"${term}"`);
    }

    return partes.join(' · ');
  });

  // Aclaración breve bajo la card: qué representa el monto mostrado.
  subtituloTotalPendiente = computed(() =>
    this.hayFiltrosActivos() ? this.resumenFiltrosActivos() : 'Mes actual + vencido'
  );

  constructor(
    private readonly cuotasService: CuotasService,
    private readonly pagosService: PagosService
  ) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      cuotas: this.cuotasService.getAll(),
      pagos: this.pagosService.getAllSimple()
    }).subscribe({
      next: ({ cuotas, pagos }) => {
        this.pagosPorCuota.set(agruparPagosPorCuota(pagos));
        this.cuotas.set(cuotas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el listado de cuotas.');
        this.loading.set(false);
      }
    });
  }

  pagado(cuota: CuotaConDetalle): number {
    return this.pagosPorCuota().get(cuota.id) ?? 0;
  }

  // Cálculo puramente visual: monto - pagos realizados (mismo criterio que el backend)
  saldo(cuota: CuotaConDetalle): number {
    return Number(cuota.monto) - this.pagado(cuota);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onEstadoChange(estado: EstadoFiltro): void {
    this.estadoFiltro.set(estado);
  }

  onAnioChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.anioFiltro.set(value === '' ? null : Number(value));
  }

  onPeriodoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.periodoFiltro.set(value === '' ? null : value);
  }

  onCursoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.cursoFiltro.set(value === '' ? null : Number(value));
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}
