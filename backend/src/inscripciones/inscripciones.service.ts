import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInscripcionDto } from '../dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from '../dto/update-inscripcion.dto';
import {
  EstadoCuota,
  EstadoInscripcion,
  TipoCuota,
} from '../../generated/prisma/enums';
import { esCuotaFutura } from './periodo-cuota.util';

@Injectable()
export class InscripcionesService {
  constructor(private readonly prisma: PrismaService) {}

  // POST
  async create(createInscripcionDto: CreateInscripcionDto) {
    // Verificar que el alumno exista
    const alumno = await this.prisma.alumno.findUnique({
      where: {
        id: createInscripcionDto.alumnoId,
      },
    });

    if (!alumno) {
      throw new NotFoundException('Alumno no encontrado');
    }

    // Verificar que el curso exista
    const curso = await this.prisma.curso.findUnique({
      where: {
        id: createInscripcionDto.cursoId,
      },
    });

    if (!curso) {
      throw new NotFoundException('Curso no encontrado');
    }

    // Verificar que el alumno no tenga una inscripción activa
    const inscripcionActiva = await this.prisma.inscripcion.findFirst({
      where: {
        alumnoId: createInscripcionDto.alumnoId,
        estado: EstadoInscripcion.ACTIVA,
      },
    });

    if (inscripcionActiva) {
      throw new ConflictException('El alumno ya tiene una inscripción activa');
    }

    return this.prisma.$transaction(async (tx) => {
      const inscripcion = await tx.inscripcion.create({
        data: {
          alumnoId: createInscripcionDto.alumnoId,
          cursoId: createInscripcionDto.cursoId,
          año: createInscripcionDto.año,
          descuentoPorcentaje: createInscripcionDto.descuentoPorcentaje ?? 0,
        },
      });
      await tx.cuota.create({
        data: {
          inscripcionId: inscripcion.id,
          periodo: createInscripcionDto.año.toString(),
          concepto: TipoCuota.MATRICULA,
          monto: curso.precioMatricula,
          // Date.UTC evita que el día 10 se corra a 9 según el huso horario del servidor.
          fechaVencimiento: new Date(Date.UTC(createInscripcionDto.año, 2, 10)),
        },
      });

      const meses = [
        { nombre: 'Marzo', numero: 2 },
        { nombre: 'Abril', numero: 3 },
        { nombre: 'Mayo', numero: 4 },
        { nombre: 'Junio', numero: 5 },
        { nombre: 'Julio', numero: 6 },
        { nombre: 'Agosto', numero: 7 },
        { nombre: 'Septiembre', numero: 8 },
        { nombre: 'Octubre', numero: 9 },
        { nombre: 'Noviembre', numero: 10 },
        { nombre: 'Diciembre', numero: 11 },
      ];

      const descuento = createInscripcionDto.descuentoPorcentaje ?? 0;

      const montoMensual = Number(curso.precioMensual) * (1 - descuento / 100);

      for (const mes of meses) {
        await tx.cuota.create({
          data: {
            inscripcionId: inscripcion.id,
            periodo: mes.nombre,
            concepto: TipoCuota.MENSUALIDAD,
            monto: montoMensual,
            estado: EstadoCuota.PENDIENTE,
            fechaVencimiento: new Date(
              Date.UTC(createInscripcionDto.año, mes.numero, 10),
            ),
          },
        });
      }

      return inscripcion;
    });
  }

  // GET
  async findAll() {
    return this.prisma.inscripcion.findMany({
      include: {
        alumno: true,
        curso: true,
      },
    });
  }

  // GET por ID
  async findOne(id: number) {
    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: {
        id,
      },
      include: {
        alumno: true,
        curso: true,
      },
    });

    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    return inscripcion;
  }

  // PATCH
  async update(id: number, updateInscripcionDto: UpdateInscripcionDto) {
    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: {
        id,
      },
    });

    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    return this.prisma.inscripcion.update({
      where: {
        id,
      },
      data: updateInscripcionDto,
    });
  }

  // Marca la inscripción como ABANDONADA y elimina, en la misma transacción,
  // las cuotas PENDIENTE de un período futuro que no tengan ningún pago
  // asociado. Todo lo demás (pagadas, parciales, vencidas, anuladas, y las
  // pendientes del mes actual o anteriores) se conserva sin cambios.
  async abandonar(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const inscripcion = await tx.inscripcion.findUnique({ where: { id } });

      if (!inscripcion) {
        throw new NotFoundException('Inscripción no encontrada');
      }

      if (inscripcion.estado !== EstadoInscripcion.ACTIVA) {
        throw new ConflictException(
          'Solo una inscripción ACTIVA puede marcarse como abandonada',
        );
      }

      const cuotasPendientes = await tx.cuota.findMany({
        where: { inscripcionId: id, estado: EstadoCuota.PENDIENTE },
        include: { pagos: true },
      });

      const idsAEliminar = cuotasPendientes
        .filter(
          (cuota) =>
            cuota.pagos.length === 0 &&
            esCuotaFutura(cuota.concepto, cuota.periodo, inscripcion.año),
        )
        .map((cuota) => cuota.id);

      if (idsAEliminar.length > 0) {
        await tx.cuota.deleteMany({ where: { id: { in: idsAEliminar } } });
      }

      return tx.inscripcion.update({
        where: { id },
        data: { estado: EstadoInscripcion.ABANDONADA },
        include: { alumno: true, curso: true },
      });
    });
  }

  // Marca la inscripción como COMPLETADA sin tocar cuotas ni pagos: se
  // conserva íntegro el historial financiero.
  async completar(id: number) {
    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id },
    });

    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    if (inscripcion.estado !== EstadoInscripcion.ACTIVA) {
      throw new ConflictException(
        'Solo una inscripción ACTIVA puede marcarse como completada',
      );
    }

    return this.prisma.inscripcion.update({
      where: { id },
      data: { estado: EstadoInscripcion.COMPLETADA },
      include: { alumno: true, curso: true },
    });
  }
}
