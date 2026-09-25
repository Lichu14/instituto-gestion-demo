import { Pipe, PipeTransform } from '@angular/core';

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Pipe centralizado para el formato de fechas del frontend.
 *
 * Uso:
 *   {{ fecha | formatFecha }}         → 08/09/2026
 *   {{ fecha | formatFecha:'time' }}  → 08/09/2026 14:35
 *
 * Recibe strings ISO (DateTime serializado por el backend) y solo cambia
 * la presentación: nunca modifica el valor original.
 */
@Pipe({
  name: 'formatFecha',
  standalone: true
})
export class FormatFechaPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    mode: 'date' | 'time' = 'date'
  ): string {
    if (!value) {
      return '-';
    }

    // En modo 'date' se lee el año/mes/día directo del string ISO (UTC),
    // sin pasar por Date local: evita que el huso horario del navegador
    // corra el día (p.ej. un vencimiento del 10 mostrado como 9).
    if (mode === 'date' && typeof value === 'string') {
      const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (coincidencia) {
        const [, yyyy, mm, dd] = coincidencia;
        return `${dd}/${mm}/${yyyy}`;
      }
    }

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime()) || date.getTime() <= 0) {
      return '-';
    }

    const dd = pad(date.getDate());
    const mm = pad(date.getMonth() + 1);
    const yyyy = date.getFullYear();

    if (mode === 'date') {
      return `${dd}/${mm}/${yyyy}`;
    }

    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }
}
