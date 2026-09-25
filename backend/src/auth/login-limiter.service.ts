import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export const LOGIN_WINDOW_SECONDS = 15 * 60;
export class LoginLimitException extends HttpException {
  constructor() {
    super('Demasiados intentos. Intentá nuevamente más tarde.', 429);
  }
}
// Conservar el offset de PostgreSQL evita conversiones de zona horaria del driver.
type Reserva = { clave: string; expira: string };

@Injectable()
export class LoginLimiterService {
  constructor(private readonly prisma: PrismaService) {}

  private clave(tipo: string, valor: string): string {
    return createHmac('sha256', process.env.JWT_SECRET!)
      .update(`${tipo}:${valor}`)
      .digest('hex');
  }

  async reservar(email: string, ip: string): Promise<Reserva[]> {
    const limites = [
      { clave: this.clave('ip', ip), maximo: 30 },
      { clave: this.clave('cuenta', email.trim().toLowerCase()), maximo: 5 },
    ];
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Limpieza acotada; la segunda condición protege ventanas recién renovadas.
        await tx.$executeRaw`
          DELETE FROM login_intentos WHERE clave IN
            (SELECT clave FROM login_intentos WHERE expira <= CURRENT_TIMESTAMP LIMIT 100)
          AND expira <= CURRENT_TIMESTAMP`;
        const reservas: Reserva[] = [];
        for (const limite of limites) {
          const filas = await tx.$queryRaw<Reserva[]>`
            INSERT INTO login_intentos (clave, intentos, expira)
            VALUES (${limite.clave}, 1, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
            ON CONFLICT (clave) DO UPDATE SET
              intentos = CASE WHEN login_intentos.expira <= CURRENT_TIMESTAMP
                THEN 1 ELSE login_intentos.intentos + 1 END,
              expira = CASE WHEN login_intentos.expira <= CURRENT_TIMESTAMP
                THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE login_intentos.expira END
            WHERE login_intentos.expira <= CURRENT_TIMESTAMP OR login_intentos.intentos < ${limite.maximo}
            RETURNING clave, expira::text`;
          if (!filas.length) throw new LoginLimitException();
          reservas.push(filas[0]);
        }
        return reservas;
      });
    } catch (error) {
      if (error instanceof LoginLimitException) throw error;
      // Sin almacén compartido no se permite saltar el límite en una instancia.
      throw new ServiceUnavailableException(
        'No pudimos iniciar sesión. Intentá nuevamente.',
      );
    }
  }

  async confirmarExito(reservas: Reserva[]): Promise<void> {
    // Solo descontar la reserva propia: un éxito no borra fallos concurrentes.
    await this.prisma.$transaction(async (tx) => {
      for (const reserva of reservas) {
        await tx.$executeRaw`
          UPDATE login_intentos SET intentos = GREATEST(intentos - 1, 0)
          WHERE clave = ${reserva.clave} AND expira = ${reserva.expira}::timestamptz`;
      }
    });
  }
}
