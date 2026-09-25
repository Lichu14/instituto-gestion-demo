import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PagosService } from '../../services/pagos.service';
import { ComprobantePago } from './comprobante-pago';

describe('Descarga del comprobante', () => {
  const descargar = vi.fn();
  beforeEach(() => {
    descargar.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: PagosService, useValue: { descargarComprobante: descargar } }] });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('impide doble descarga, recupera el botón y permite reintentar sin detalles técnicos', async () => {
    const first = new Subject<HttpResponse<Blob>>();
    const retry = new Subject<HttpResponse<Blob>>();
    descargar.mockReturnValueOnce(first).mockReturnValueOnce(retry);
    const fixture = TestBed.createComponent(ComprobantePago);
    fixture.componentRef.setInput('pagoId', 42);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector('button')!;
    button.click();
    fixture.componentInstance.descargar();
    await fixture.whenStable();
    expect(descargar).toHaveBeenCalledExactlyOnceWith(42);
    expect(button.disabled).toBe(true);
    first.error(new Error('detalle técnico'));
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    expect(el.querySelector('[role=alert]')?.textContent).toBe('No se pudo descargar el comprobante. Intentá nuevamente.');
    button.click();
    await fixture.whenStable();
    expect(el.querySelector('[role=alert]')).toBeNull();
    retry.complete();
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });

  it('descarga el mismo Blob con el nombre enviado por el backend y libera el recurso', async () => {
    const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    descargar.mockReturnValue(of(new HttpResponse({ body: pdf, headers: new HttpHeaders({
      'Content-Disposition': 'attachment; filename="comprobante-pago-Juan-Perez-2026-09-42.pdf"',
    }) })));
    const createObjectURL = vi.fn(() => 'blob:comprobante-test');
    const revokeObjectURL = vi.fn();
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL {
      static override createObjectURL = createObjectURL;
      static override revokeObjectURL = revokeObjectURL;
    });
    let clicked: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked = this; });
    const fixture = TestBed.createComponent(ComprobantePago);
    fixture.componentRef.setInput('pagoId', 42);
    fixture.componentInstance.descargar();
    await fixture.whenStable();
    expect(createObjectURL).toHaveBeenCalledWith(pdf);
    expect(clicked?.download).toBe('comprobante-pago-Juan-Perez-2026-09-42.pdf');
    expect(clicked?.isConnected).toBe(false);
    expect(fixture.componentInstance.descargando()).toBe(false);
    expect(fixture.componentInstance.error()).toBe('');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:comprobante-test');
  });
});
