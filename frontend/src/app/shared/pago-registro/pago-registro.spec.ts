import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PagoRegistro } from './pago-registro';

describe('Auditoría visible del pago', () => {
  it('separa usuario registrador y fecha de registro del pagador y la fecha del pago', async () => {
    const fixture = TestBed.createComponent(PagoRegistro);
    fixture.componentRef.setInput('pago', {
      usuarioRegistro: { id: 7, nombre: 'Administradora' }, fechaRegistro: '2026-09-23T18:40:00Z',
      nombrePagador: 'Familia Pérez', fechaPago: '2026-01-05T13:45:00Z',
    });
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Registrado por: Administradora');
    expect(el.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-23T18:40:00Z');
    expect(el.textContent).not.toContain('Familia Pérez');
    expect(el.textContent).not.toContain('05/01/2026');
  });

  it('no inventa la identidad ni usa fechaPago como registro de un pago histórico', async () => {
    const fixture = TestBed.createComponent(PagoRegistro);
    fixture.componentRef.setInput('pago', { usuarioRegistro: null, fechaRegistro: null, fechaPago: '2026-01-05T13:45:00Z' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent.trim()).toBe('Registro anterior a la auditoría');
    expect(fixture.nativeElement.querySelector('time')).toBeNull();
  });
});
