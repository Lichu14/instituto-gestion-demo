import { PDFDocument, PDFPage } from 'pdf-lib';
import { Prisma } from '../../generated/prisma/client';
import { generarComprobantePagoPdf } from './comprobante-pago.pdf';
import type { PagoComprobante } from './comprobante-pago.service';

const pago: PagoComprobante = {
  id: 42,
  monto: new Prisma.Decimal('12345.67'),
  medio: 'TRANSFERENCIA',
  nombrePagador: 'Familia Muñoz',
  estado: 'CONFIRMADO',
  fechaPago: new Date('2026-09-21T02:00:00Z'),
  fechaRegistro: new Date('2026-09-23T17:15:00Z'),
  usuarioRegistro: { nombre: 'Administradora' },
  cuota: {
    concepto: 'MENSUALIDAD',
    periodo: 'Septiembre',
    inscripcion: {
      año: 2026,
      curso: { nombre: 'Kids 1' },
      alumno: { nombre: 'Juan', apellido: 'Pérez' },
    },
  },
};

describe('Comprobante de pago PDF', () => {
  afterEach(() => jest.restoreAllMocks());

  it('genera bytes estables e incluye fechas independientes, identidad y monto', async () => {
    const text = jest.spyOn(PDFPage.prototype, 'drawText');
    const a = await generarComprobantePagoPdf(pago, 'Instituto Gestión');
    const b = await generarComprobantePagoPdf(pago, 'Instituto Gestión');
    expect(a.buffer.equals(b.buffer)).toBe(true);
    expect(a.filename).toBe('comprobante-pago-Juan-Perez-2026-09-42.pdf');
    const written = text.mock.calls.map(([value]) => value).join('\n');
    for (const value of [
      'Instituto Gestión',
      'Juan Pérez',
      'Mensualidad',
      'Septiembre',
      '20/09/2026',
      '12.345,67',
      'Transferencia',
      'Familia Muñoz',
      'Administradora',
      '23/09/2026',
      '14:15',
      'Confirmado',
      'Este comprobante corresponde a un pago registrado en el sistema.',
    ])
      expect(written).toContain(value);
    expect((await PDFDocument.load(a.buffer)).getPageCount()).toBe(1);
  });

  it('no inventa auditoría histórica y destaca la anulación', async () => {
    const text = jest.spyOn(PDFPage.prototype, 'drawText');
    await generarComprobantePagoPdf(
      {
        ...pago,
        estado: 'ANULADO',
        usuarioRegistro: null,
        fechaRegistro: null,
        nombrePagador: null,
      },
      'Academia',
    );
    const written = text.mock.calls.map(([value]) => value).join('\n');
    expect(written).toContain('PAGO ANULADO.');
    expect(written).toContain('No disponible (registro histórico)');
    expect(written).toContain('No informado');
    expect(written).not.toContain('23/09/2026');
  });

  it('distribuye textos largos sin salir de márgenes ni fallar por caracteres ajenos a Helvetica', async () => {
    const text = jest.spyOn(PDFPage.prototype, 'drawText');
    const result = await generarComprobantePagoPdf(
      { ...pago, nombrePagador: 'ApellidoMuyLargo'.repeat(220) + ' 🌟' },
      'Academia',
    );
    expect(
      (await PDFDocument.load(result.buffer)).getPageCount(),
    ).toBeGreaterThan(1);
    for (const [value, options] of text.mock.calls) {
      expect(options!.y).toBeGreaterThanOrEqual(32);
      expect(
        options!.x! + options!.font!.widthOfTextAtSize(value, options!.size!),
      ).toBeLessThanOrEqual(552);
    }
  });
});
