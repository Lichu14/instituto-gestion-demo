import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCuotaDto } from '../dto/update-cuota.dto';

@Injectable()
export class CuotasService {
  constructor(private readonly prisma: PrismaService) {}

  // Marca VENCIDA toda cuota impaga cuyo día 10 ya terminó (paga hasta el 10 inclusive, vencida desde el 11)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async marcarCuotasVencidas() {
    const ahora = new Date();
    const inicioDeHoyUtc = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
    );

    await this.prisma.cuota.updateMany({
      where: {
        estado: { in: ['PENDIENTE', 'PAGO_PARCIAL'] },
        fechaVencimiento: { lt: inicioDeHoyUtc },
      },
      data: {
        estado: 'VENCIDA',
      },
    });
  }

  // GET ALL
  async findAll() {
    return this.prisma.cuota.findMany({
      include: {
        inscripcion: {
          include: {
            alumno: true,
            curso: true,
          },
        },
      },
    });
  }

  // GET ONE
  async findOne(id: number) {
    const cuota = await this.prisma.cuota.findUnique({
      where: {
        id,
      },
      include: {
        inscripcion: {
          include: {
            alumno: true,
            curso: true,
          },
        },
      },
    });

    if (!cuota) {
      throw new NotFoundException('Cuota no encontrada');
    }

    return cuota;
  }

  // PATCH
  async update(id: number, updateCuotaDto: UpdateCuotaDto) {
    const cuota = await this.prisma.cuota.findUnique({
      where: {
        id,
      },
    });

    if (!cuota) {
      throw new NotFoundException('Cuota no encontrada');
    }

    // Anular una PAGADA requeriría definir qué pasa con sus pagos confirmados;
    // hasta entonces, no se permite.
    if (updateCuotaDto.estado === 'ANULADA' && cuota.estado === 'PAGADA') {
      throw new ConflictException(
        'No se puede anular una cuota PAGADA',
      );
    }

    const cuotaActualizada = await this.prisma.cuota.update({
      where: {
        id,
      },
      data: updateCuotaDto,
    });

    return cuotaActualizada;
  }
}
