import { Injectable, NotFoundException } from '@nestjs/common';
import { AlumnosService } from './alumnos.service';
import { generarEstadoCuentaPdf } from './estado-cuenta.pdf';

@Injectable()
export class EstadoCuentaService {
  constructor(private readonly alumnos: AlumnosService) {}

  async generar(id: number) {
    const emitido = new Date();
    const alumno = await this.alumnos.findOne(id, emitido);
    if (!alumno) throw new NotFoundException('Alumno no encontrado');
    return generarEstadoCuentaPdf(
      alumno,
      emitido,
      process.env.ACADEMIA_NOMBRE?.trim() || 'Instituto Gestión',
    );
  }
}
