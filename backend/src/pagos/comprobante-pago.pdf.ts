import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib';
import type { PagoComprobante } from './comprobante-pago.service';
import {
  coloresPdf,
  fechaPdf,
  monedaPdf,
  limpiarTextoPdf,
  lineasPdf,
} from '../shared/pdf.util';
import { diaAcademia } from '../alumnos/estado-cuenta.util';

/** Único generador para descarga y email. Sin disco, red ni cambios financieros. */
export async function generarComprobantePagoPdf(
  pago: PagoComprobante,
  academia: string,
) {
  const doc = await PDFDocument.create();
  const alumno = pago.cuota.inscripcion.alumno;
  const nombre = `${alumno.nombre} ${alumno.apellido}`.trim();
  doc.setTitle(`Comprobante de pago #${pago.id}`);
  doc.setAuthor(academia);
  // Metadatos estables: los mismos datos producen exactamente los mismos bytes.
  const fechaDocumento = pago.fechaRegistro ?? pago.fechaPago;
  doc.setCreationDate(fechaDocumento);
  doc.setModificationDate(fechaDocumento);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { ink, muted, green, border, soft } = coloresPdf;
  const margin = 44,
    width = 507.28,
    bottom = 72;
  let page: PDFPage;
  let y = 0;
  const text = (
    value: string,
    x: number,
    top: number,
    size = 10,
    font = regular,
    color = ink,
  ) => {
    page.drawText(limpiarTextoPdf(value, font), {
      x,
      y: top - size,
      size,
      font,
      color,
    });
  };
  const newPage = () => {
    page = doc.addPage([595.28, 841.89]);
    y = 798;
    text(
      `Comprobante de pago #${pago.id} (continuación)`,
      margin,
      y,
      10,
      bold,
      green,
    );
    y -= 30;
  };
  const ensure = (height: number) => {
    if (y - height < bottom) newPage();
  };
  const paragraph = (value: string, size = 10, font = regular, color = ink) => {
    for (const line of lineasPdf(value, width, font, size)) {
      ensure(size + 5);
      text(line, margin, y, size, font, color);
      y -= size + 5;
    }
  };
  const row = (label: string, value: string) => {
    const lines = lineasPdf(value, width - 166, regular, 10);
    ensure(Math.min(lines.length * 15 + 20, 140));
    text(label, margin, y, 9, regular, muted);
    for (const line of lines) {
      if (y - 15 < bottom) {
        newPage();
        text(`${label} (cont.)`, margin, y, 9, regular, muted);
      }
      text(line, margin + 166, y);
      y -= 15;
    }
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + width, y },
      color: border,
      thickness: 0.5,
    });
    y -= 13;
  };

  page = doc.addPage([595.28, 841.89]);
  y = 798;
  paragraph(academia, 13, bold, green);
  y -= 14;
  paragraph('Comprobante de pago', 25, bold);
  paragraph(
    `Pago #${pago.id} · ${pago.estado === 'ANULADO' ? 'ANULADO' : 'Confirmado'}`,
    10,
    bold,
    muted,
  );
  y -= 20;
  paragraph('ALUMNO', 8, bold, muted);
  paragraph(nombre, 17, bold);
  paragraph(
    `${pago.cuota.inscripcion.curso.nombre} · Ciclo lectivo ${pago.cuota.inscripcion.año}`,
    10,
    regular,
    muted,
  );
  y -= 18;
  const monto = monedaPdf(pago.monto.toString());
  const montoSize = Math.min(
    27,
    (27 * (width - 32)) / bold.widthOfTextAtSize(monto, 27),
  );
  ensure(100);
  page.drawRectangle({ x: margin, y: y - 82, width, height: 82, color: soft });
  text('MONTO DEL PAGO', margin + 16, y - 13, 8, bold, muted);
  text(monto, margin + 16, y - 32, montoSize, bold, green);
  y -= 103;
  row(
    'Concepto / cuota',
    pago.cuota.concepto === 'MATRICULA' ? 'Matrícula' : 'Mensualidad',
  );
  row('Período', `${pago.cuota.periodo} · ${pago.cuota.inscripcion.año}`);
  row('Fecha del pago', fechaPdf(pago.fechaPago));
  row(
    'Medio de pago',
    pago.medio === 'EFECTIVO' ? 'Efectivo' : 'Transferencia',
  );
  row('Pagador', pago.nombrePagador || 'No informado');
  row(
    'Registrado por',
    pago.usuarioRegistro?.nombre || 'No disponible (registro histórico)',
  );
  row(
    'Fecha y hora de registro',
    pago.fechaRegistro
      ? `${fechaPdf(pago.fechaRegistro, true)} (hora Argentina)`
      : 'No disponible (registro histórico)',
  );
  y -= 7;
  if (pago.estado === 'ANULADO') {
    paragraph(
      'PAGO ANULADO. Este comprobante no acredita un pago vigente.',
      10,
      bold,
    );
    y -= 6;
  }
  paragraph(
    'Este comprobante corresponde a un pago registrado en el sistema.',
    9,
    regular,
    muted,
  );
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: margin, y: 47 },
      end: { x: margin + width, y: 47 },
      color: border,
      thickness: 0.5,
    });
    p.drawText(
      `Comprobante de pago #${pago.id} · Página ${i + 1} de ${pages.length}`,
      { x: margin, y: 32, size: 8, font: regular, color: muted },
    );
  });
  const slug =
    nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'alumno';
  return {
    buffer: Buffer.from(await doc.save()),
    filename: `comprobante-pago-${slug}-${diaAcademia(pago.fechaPago).slice(0, 7)}-${pago.id}.pdf`,
  };
}
