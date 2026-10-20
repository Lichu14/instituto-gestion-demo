import { Component, input } from '@angular/core';

const paths = {
  home: 'm3 10 9-7 9 7 M5 9v11h5v-6h4v6h5V9',
  users:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a7 7 0 0 1 14 0v3Z M17 4a4 4 0 0 1 0 7 M19 15a6 6 0 0 1 3 5v1',
  book: 'M12 5v16 M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1',
  enrollment: 'M14 2H5v20h14V7Z M14 2v5h5 M8 11h8 M8 15h8 M8 19h5',
  card: 'M3 4h18v16H3Z M3 9h18 M6 14h4 M6 17h7 M17 14h1',
  money: 'M12 2v20 M17 6c-1-2-9-3-10 1-2 6 12 4 10 10-1 4-9 3-11 1',
  teacher: 'm2 8 10-5 10 5-10 5Z M6 10v7c4 3 8 3 12 0v-7 M22 8v8',
  logout: 'M10 3H3v18h7 M8 12h14 m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  calendar: 'M4 5h16v16H4Z M8 2v6 M16 2v6 M4 10h16 M8 14h1 M15 14h1 M8 18h1',
  chart: 'M4 21v-7h3v7Z M11 21V9h3v12Z M18 21V3h3v18Z',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',
  alert: 'M12 7v6 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  check: 'm5 12 4 4L19 6',
} as const;

/** Decorative only: the adjacent text gives the control its accessible name. */
@Component({
  selector: 'app-icon',
  standalone: true,
  host: { 'aria-hidden': 'true' },
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="paths[name()]" /></svg>',
  styles: [
    ':host { display: inline-flex; width: 1.25em; height: 1.25em; flex: none; } svg { display: block; width: 100%; height: 100%; }',
  ],
})
export class Icon {
  readonly name = input.required<keyof typeof paths>();
  protected readonly paths = paths;
}
