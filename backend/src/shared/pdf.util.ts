import { type PDFFont, rgb } from 'pdf-lib';
import { ZONA_ACADEMIA } from '../alumnos/estado-cuenta.util';

export const coloresPdf = {
  ink: rgb(0.16, 0.18, 0.17),
  muted: rgb(0.39, 0.42, 0.4),
  green: rgb(0.25, 0.4, 0.35),
  border: rgb(0.87, 0.88, 0.86),
  soft: rgb(0.96, 0.97, 0.95),
};

export const monedaPdf = (valor: string) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number(valor));

export const fechaPdf = (valor: Date, hora = false) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_ACADEMIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(hora
      ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }
      : {}),
  }).format(valor);

// Helvetica admite español; otros caracteres no deben impedir la descarga.
export const limpiarTextoPdf = (value: string, font: PDFFont) =>
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

export function lineasPdf(
  value: string,
  maxWidth: number,
  font: PDFFont,
  size = 9,
): string[] {
  const result: string[] = [];
  let line = '';
  for (const word of limpiarTextoPdf(value, font).split(/\s+/)) {
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
}
