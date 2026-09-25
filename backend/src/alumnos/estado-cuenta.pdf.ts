import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { AlumnosService } from './alumnos.service';
import { resumirCuotas, ZONA_ACADEMIA } from './estado-cuenta.util';

type Alumno = NonNullable<Awaited<ReturnType<AlumnosService['findOne']>>>;
const moneda = (valor: string) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number(valor));
const fecha = (valor: Date) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_ACADEMIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(valor);
const estados = {
  PAGADA: 'Pagada',
  PENDIENTE: 'Pendiente',
  PAGO_PARCIAL: 'Pago parcial',
  VENCIDA: 'Vencida',
  ANULADA: 'Anulada',
};
const concepto = (valor: string) =>
  valor === 'MATRICULA' ? 'Matrícula' : 'Mensualidad';
const meses = [
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const orden = (cuota: Alumno['inscripciones'][number]['cuotas'][number]) =>
  cuota.concepto === 'MATRICULA'
    ? -1
    : meses.includes(cuota.periodo)
      ? meses.indexOf(cuota.periodo)
      : 100 + cuota.fechaVencimiento.getTime() / 86400000;

/** PDF vectorial en memoria: sin HTML, navegador, red ni archivos en el servidor. */
export async function generarEstadoCuentaPdf(
  alumno: Alumno,
  emitido: Date,
  academia: string,
) {
  const doc = await PDFDocument.create();
  doc.setTitle('Estado de cuenta del alumno');
  doc.setAuthor(academia);
  doc.setCreationDate(emitido);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.16, 0.18, 0.17),
    muted = rgb(0.39, 0.42, 0.4),
    green = rgb(0.25, 0.4, 0.35);
  const border = rgb(0.87, 0.88, 0.86),
    soft = rgb(0.96, 0.97, 0.95);
  const margin = 44,
    width = 507.28,
    bottom = 66;
  let page: PDFPage;
  let y = 0;

  // Standard fonts cover Spanish, accents and ñ; unsupported glyphs do not abort the download.
  const clean = (value: string, font = regular) =>
    Array.from(value.replace(/[\r\n\t]+/g, ' '))
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          return '?';
        }
      })
      .join('');
  const lines = (
    value: string,
    maxWidth: number,
    font = regular,
    size = 9,
  ): string[] => {
    const result: string[] = [];
    let line = '';
    for (const word of clean(value, font).split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) result.push(line);
      line = '';
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > maxWidth && line) {
          result.push(line);
          line = '';
        }
        line += char;
      }
    }
    result.push(line);
    return result;
  };
  const text = (
    value: string,
    x: number,
    top: number,
    size = 9,
    font = regular,
    color = ink,
  ) => {
    page.drawText(clean(value, font), { x, y: top - size, size, font, color });
  };
  const paragraph = (value: string, size = 9, font = regular, color = ink) => {
    for (const line of lines(value, width, font, size)) {
      ensure(size + 5);
      text(line, margin, y, size, font, color);
      y -= size + 5;
    }
  };
  const newPage = () => {
    page = doc.addPage([595.28, 841.89]);
    y = 801.89;
    for (const line of lines(academia, width, bold, 12)) {
      text(line, margin, y, 12, bold, green);
      y -= 16;
    }
    if (doc.getPageCount() > 1) {
      for (const line of lines(
        `${alumno.nombre} ${alumno.apellido} · Estado de cuenta`,
        width,
        regular,
        9,
      )) {
        text(line, margin, y, 9, regular, muted);
        y -= 13;
      }
    }
    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: margin + width, y: y - 6 },
      color: border,
      thickness: 0.7,
    });
    y -= 24;
  };
  function ensure(height: number) {
    if (y - height < bottom) newPage();
  }
  const title = (value: string, size = 12) => {
    ensure(55);
    paragraph(value, size, bold, green);
    y -= 5;
  };

  type Column = { title: string; width: number; right?: boolean };
  const table = (
    heading: string,
    columns: Column[],
    rows: string[][],
    context: string,
  ) => {
    const header = (continued = false) => {
      title(`${heading}${continued ? ' (continuación)' : ''}`);
      if (continued) {
        paragraph(context, 8, regular, muted);
        y -= 5;
      }
      page.drawRectangle({
        x: margin,
        y: y - 27,
        width,
        height: 27,
        color: soft,
      });
      let x = margin;
      columns.forEach((column) => {
        const value = column.title;
        text(
          value,
          column.right
            ? x + column.width - 8 - bold.widthOfTextAtSize(value, 8)
            : x + 8,
          y - 8,
          8,
          bold,
          muted,
        );
        x += column.width;
      });
      y -= 27;
    };
    ensure(90);
    header();
    for (const row of rows) {
      const cells = row.map((value, i) => lines(value, columns[i].width - 16));
      const count = Math.max(...cells.map((cell) => cell.length));
      // Split exceptionally long cells safely, repeating context and column headings.
      let offset = 0;
      while (offset < count) {
        if (y - 28 < bottom) {
          newPage();
          header(true);
        }
        let take = Math.min(count - offset, Math.floor((y - bottom - 16) / 13));
        if (take < count - offset && offset === 0 && count * 13 + 16 < 560) {
          newPage();
          header(true);
          take = Math.min(count, Math.floor((y - bottom - 16) / 13));
        }
        take = Math.max(1, take);
        let x = margin;
        cells.forEach((cell, i) => {
          cell.slice(offset, offset + take).forEach((line, index) => {
            text(
              line,
              columns[i].right
                ? x + columns[i].width - 8 - regular.widthOfTextAtSize(line, 9)
                : x + 8,
              y - 8 - index * 13,
            );
          });
          x += columns[i].width;
        });
        y -= take * 13 + 16;
        page.drawLine({
          start: { x: margin, y },
          end: { x: margin + width, y },
          color: border,
          thickness: 0.5,
        });
        offset += take;
      }
    }
    y -= 20;
  };

  newPage();
  paragraph('Estado de cuenta', 23, bold);
  y -= 7;
  paragraph(`${alumno.nombre} ${alumno.apellido}`, 15, bold);
  paragraph(`Fecha de emisión: ${fecha(emitido)}`, 9, regular, muted);
  y -= 16;
  const resumen = resumirCuotas(alumno.inscripciones.flatMap((i) => i.cuotas));
  const metrics = [
    ['Total abonado', resumen.abonado],
    ['Saldo pendiente', resumen.pendiente],
    ['De ese saldo, vencido', resumen.vencido],
  ];
  const metricWidth = width / 3;
  metrics.forEach(([label, value], i) => {
    const x = margin + i * metricWidth;
    page.drawRectangle({
      x,
      y: y - 58,
      width: metricWidth - 4,
      height: 58,
      color: soft,
    });
    text(label, x + 10, y - 9, 8, regular, muted);
    const amount = moneda(value);
    const size = Math.min(
      15,
      (metricWidth - 24) / bold.widthOfTextAtSize(amount, 1),
    );
    text(amount, x + 10, y - 28, size, bold, green);
  });
  y -= 73;
  paragraph(
    'Importes en pesos argentinos. El saldo pendiente incluye cuotas futuras ya generadas; el vencido forma parte de ese saldo.',
    8,
    regular,
    muted,
  );
  paragraph(
    'Se suman solo pagos confirmados. Las cuotas pagadas y anuladas no integran la deuda del resumen.',
    8,
    regular,
    muted,
  );
  y -= 16;

  if (!alumno.inscripciones.length)
    paragraph('El alumno no tiene inscripciones registradas.');
  for (const inscripcion of [...alumno.inscripciones].sort(
    (a, b) => a.año - b.año || a.id - b.id,
  )) {
    const context = `${inscripcion.curso.nombre} · Ciclo lectivo ${inscripcion.año}`;
    ensure(130);
    title(context, 13);
    const cuotas = [...inscripcion.cuotas].sort(
      (a, b) => orden(a) - orden(b) || a.id - b.id,
    );
    if (!cuotas.length) {
      paragraph(
        'Sin cuotas ni pagos registrados para esta inscripción.',
        9,
        regular,
        muted,
      );
      y -= 18;
      continue;
    }
    table(
      'Cuotas',
      [
        { title: 'Período', width: 82 },
        { title: 'Concepto', width: 101 },
        { title: 'Monto', width: 102, right: true },
        { title: 'Estado', width: 106 },
        { title: 'Saldo', width: 116.28, right: true },
      ],
      cuotas.map((c) => [
        c.periodo,
        concepto(c.concepto),
        moneda(c.monto.toString()),
        estados[c.estado],
        moneda(c.saldo),
      ]),
      context,
    );
    const pagos = cuotas
      .flatMap((cuota) => cuota.pagos.map((pago) => ({ pago, cuota })))
      .sort(
        (a, b) =>
          a.pago.fechaPago.getTime() - b.pago.fechaPago.getTime() ||
          a.pago.id - b.pago.id,
      );
    if (pagos.length) {
      table(
        'Pagos registrados',
        [
          { title: 'Fecha', width: 75 },
          { title: 'Monto', width: 98, right: true },
          { title: 'Medio', width: 93 },
          { title: 'Cuota / concepto', width: 164 },
          { title: 'Estado', width: 77.28 },
        ],
        pagos.map(({ pago, cuota }) => [
          fecha(pago.fechaPago),
          moneda(pago.monto.toString()),
          pago.medio === 'EFECTIVO' ? 'Efectivo' : 'Transferencia',
          `${cuota.periodo} · ${concepto(cuota.concepto)}`,
          pago.estado === 'CONFIRMADO' ? 'Confirmado' : 'Anulado',
        ]),
        context,
      );
    } else {
      title('Pagos registrados');
      paragraph(
        'Sin pagos registrados para esta inscripción.',
        9,
        regular,
        muted,
      );
      y -= 18;
    }
  }
  ensure(70);
  paragraph(
    'El saldo de cada cuota corresponde a su monto menos los pagos confirmados registrados, conservando el estado informado por el sistema.',
    8,
    regular,
    muted,
  );
  y -= 6;
  paragraph(
    'Este documento refleja la información registrada en el sistema a la fecha de emisión.',
    9,
    regular,
    muted,
  );
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    p.drawLine({
      start: { x: margin, y: 47 },
      end: { x: margin + width, y: 47 },
      color: border,
      thickness: 0.5,
    });
    p.drawText(
      `Estado de cuenta · ${fecha(emitido)} · Página ${index + 1} de ${pages.length}`,
      { x: margin, y: 32, size: 8, font: regular, color: muted },
    );
  });
  return Buffer.from(await doc.save());
}
