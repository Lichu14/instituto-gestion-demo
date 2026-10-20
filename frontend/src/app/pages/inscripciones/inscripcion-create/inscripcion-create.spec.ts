import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlumnosService } from '../../../services/alumnos.service';
import { CursosService } from '../../../services/cursos.service';
import { InscripcionesService } from '../../../services/inscripciones.service';
import { InscripcionCreate } from './inscripcion-create';

describe('Inscripción: mes de inicio', () => {
  const create = vi.fn();
  const navigate = vi.fn().mockResolvedValue(true);

  beforeEach(async () => {
    create.mockReset();
    navigate.mockClear();
    await TestBed.configureTestingModule({
      imports: [InscripcionCreate],
      providers: [
        provideRouter([]),
        { provide: AlumnosService, useValue: { getAll: () => of([
          { id: 21, nombre: 'Alma', apellido: 'Prueba', dni: '10000001' }
        ]) } },
        { provide: CursosService, useValue: { getAll: () => of([
          { id: 31, nombre: 'Curso ficticio', precioMensual: '100' }
        ]) } },
        { provide: InscripcionesService, useValue: { create } }
      ]
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function setup() {
    const fixture = TestBed.createComponent(InscripcionCreate);
    await fixture.whenStable();
    fixture.componentInstance.form.patchValue({ alumnoId: 21, cursoId: 31, anio: 2026 });
    fixture.detectChanges();
    return fixture;
  }

  it('exige elegir un mes y ofrece marzo–diciembre con etiqueta y ayuda accesibles', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const element: HTMLElement = fixture.nativeElement;
    const select = element.querySelector<HTMLSelectElement>('#mesInicio')!;
    expect(component.form.controls.mesInicio.value).toBeNull();
    expect(component.form.invalid).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    expect(Array.from(select.options).slice(1).map(option => option.text.trim())).toEqual([
      'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
      'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]);
    expect(select.labels![0].textContent).toBe('Mes de inicio *');
    expect(select.getAttribute('aria-describedby')).toBe('mesInicio-ayuda');
    component.onSubmit();
    fixture.detectChanges();
    expect(create).not.toHaveBeenCalled();
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#mesInicio-error')!.textContent).toContain('marzo y diciembre');
  });

  it('envía julio como número y el año como «año», sin doble envío', async () => {
    const response = new Subject();
    create.mockReturnValue(response);
    const fixture = await setup();
    const select = fixture.nativeElement.querySelector('#mesInicio') as HTMLSelectElement;
    select.selectedIndex = 5; // Placeholder, marzo, abril, mayo, junio, julio.
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(fixture.componentInstance.form.controls.mesInicio.value).toBe(7);
    fixture.componentInstance.onSubmit();
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();
    expect(create).toHaveBeenCalledExactlyOnceWith({
      alumnoId: 21, cursoId: 31, año: 2026, mesInicio: 7
    });
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    response.complete();
  });

  it('muestra el error y permite reintentar conservando el mes elegido', async () => {
    const first = new Subject();
    const retry = new Subject();
    create.mockReturnValueOnce(first).mockReturnValueOnce(retry);
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.form.controls.mesInicio.setValue(7);
    component.onSubmit();
    first.error({ error: { message: 'El alumno ya tiene una inscripción activa' } });
    fixture.detectChanges();
    expect(component.submitting()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('El alumno ya tiene una inscripción activa');
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(false);
    component.onSubmit();
    expect(create).toHaveBeenCalledTimes(2);
    expect(component.submitError()).toBe('');
    expect(component.form.controls.mesInicio.value).toBe(7);
    retry.complete();
  });

  it('conserva el descuento y la navegación al detalle después del alta', async () => {
    const response = new Subject();
    create.mockReturnValue(response);
    const fixture = await setup();
    vi.useFakeTimers();
    const component = fixture.componentInstance;
    component.form.patchValue({ mesInicio: 12, descuentoPorcentaje: 15 });
    component.onSubmit();
    response.next({ id: 42 });
    response.complete();
    expect(create).toHaveBeenCalledWith({
      alumnoId: 21, cursoId: 31, año: 2026, mesInicio: 12, descuentoPorcentaje: 15
    });
    expect(component.successMessage()).toContain('Inscripción creada correctamente');
    expect(component.submitting()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(navigate).toHaveBeenCalledWith(['/inscripciones', 42]);
  });
});
