import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlumnoConInscripciones } from '../../../models/alumno.model';
import { AlumnosService } from '../../../services/alumnos.service';
import { CuotasService } from '../../../services/cuotas.service';
import { AlumnoDetail } from './alumno-detail';

describe('Descarga del estado de cuenta', () => {
  const descargar = vi.fn();
  const getById = vi.fn();

  beforeEach(async () => {
    descargar.mockReset();
    getById.mockReset();
    getById.mockReturnValue(of({ id: 1, nombre: 'María', apellido: 'Muñoz', estado: 'ACTIVO', inscripciones: [] }));
    await TestBed.configureTestingModule({
      imports: [AlumnoDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '1']]) } } },
        { provide: AlumnosService, useValue: {
          getById,
          descargarEstadoCuenta: descargar,
        } },
        { provide: CuotasService, useValue: {} },
      ],
    }).compileComponents();
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('evita solicitudes duplicadas y permite reintentar sin mostrar detalles técnicos', async () => {
    const first = new Subject<Blob>();
    const retry = new Subject<Blob>();
    descargar.mockReturnValueOnce(first).mockReturnValueOnce(retry);
    const fixture = TestBed.createComponent(AlumnoDetail);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('.download-statement')!;

    button.click();
    fixture.componentInstance.descargarEstadoCuenta();
    await fixture.whenStable();
    expect(descargar).toHaveBeenCalledExactlyOnceWith(1);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Generando PDF...');

    first.error(new HttpErrorResponse({ status: 500, error: 'technical details' }));
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    expect(element.querySelector('[role="alert"]')?.textContent)
      .toBe('No se pudo descargar el estado de cuenta. Intentá nuevamente.');
    button.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(button.disabled).toBe(true);
    retry.complete();
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });

  it('descarga el Blob con nombre PDF sin navegar ni modificar al alumno', async () => {
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    descargar.mockReturnValue(of(pdf));
    const createObjectURL = vi.fn(() => 'blob:test-statement');
    const revokeObjectURL = vi.fn();
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    let clicked: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = this;
    });
    const fixture = TestBed.createComponent(AlumnoDetail);
    await fixture.whenStable();
    const before = fixture.componentInstance.alumno();
    fixture.componentInstance.descargarEstadoCuenta();
    await fixture.whenStable();
    expect(createObjectURL).toHaveBeenCalledWith(pdf);
    expect(clicked?.download).toBe('estado-cuenta-alumno-1.pdf');
    expect(clicked?.href).toBe('blob:test-statement');
    expect(clicked?.isConnected).toBe(false);
    expect(fixture.componentInstance.alumno()).toBe(before);
    expect(fixture.componentInstance.descargaError()).toBe('');
    expect(fixture.componentInstance.descargandoEstadoCuenta()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-statement');
  });

  it('abre activas, pliega históricas y mantiene estados independientes', async () => {
    const inscripcionBase = {
      alumnoId: 1,
      cursoId: 1,
      año: 2026,
      fechaInscripcion: '2026-03-01',
      descuentoPorcentaje: '10',
      curso: {
        id: 1,
        nombre: 'Kids 1',
        precioMensual: '80000',
        precioMatricula: '30000',
        estado: 'ACTIVO' as const,
        profesoraId: 1,
      },
      cuotas: [],
    };
    const alumno: AlumnoConInscripciones = {
      id: 1,
      nombre: 'María',
      apellido: 'Muñoz',
      dni: '12345678',
      fechaNacimiento: '2015-01-01',
      telefono: '1111111111',
      email: null,
      estado: 'ACTIVO',
      fechaAlta: '2026-02-01',
      inscripciones: [
        { ...inscripcionBase, id: 11, estado: 'ACTIVA' },
        {
          ...inscripcionBase,
          id: 12,
          estado: 'ABANDONADA',
          curso: { ...inscripcionBase.curso, id: 2, nombre: 'Kids 2' },
        },
        {
          ...inscripcionBase,
          id: 13,
          estado: 'COMPLETADA',
          curso: { ...inscripcionBase.curso, id: 3, nombre: 'Teens' },
        },
      ],
    };
    getById.mockReturnValue(of(alumno));
    const fixture = TestBed.createComponent(AlumnoDetail);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('.enrollment-toggle'));
    const contents = Array.from(element.querySelectorAll<HTMLElement>('.enrollment-content'));

    expect(buttons.map((button) => button.getAttribute('aria-expanded')))
      .toEqual(['true', 'false', 'false']);
    expect(contents[0].hasAttribute('inert')).toBe(false);
    expect(contents[1].getAttribute('aria-hidden')).toBe('true');
    expect(contents[1].hasAttribute('inert')).toBe(true);

    buttons[1].click();
    await fixture.whenStable();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[2].getAttribute('aria-expanded')).toBe('false');

    buttons[0].click();
    await fixture.whenStable();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');

    fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    expect(fixture.componentInstance.inscripcionDesplegada(11)).toBe(false);
    expect(fixture.componentInstance.inscripcionDesplegada(12)).toBe(true);
    expect(fixture.componentInstance.inscripcionDesplegada(13)).toBe(false);
  });
});
