import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatMoneda',
  standalone: true
})
export class FormatMonedaPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });

  transform(value: string | number): string {
    return this.formatter.format(Number(value)).replace(/\$\s+(?=\d)/, '$');
  }
}
