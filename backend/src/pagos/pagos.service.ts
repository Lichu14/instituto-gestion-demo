import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, type Cuota } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePagoDto } from '../dto/create-pago.dto';
import { UpdatePagoDto } from '../dto/update-pago.dto';
import { EmailService } from '../email/email.service';
import { registroPagoInclude, snapshotPago } from './pago-auditoria';
import { diaAcademia } from '../alumnos/estado-cuenta.util';
import { ComprobantePagoService } from './comprobante-pago.service';

const detallePagoInclude = {
  ...registroPagoInclude,
  cuota: {
    include: { inscripcion: { include: { alumno: true, curso: true } } },
  },
} satisfies Prisma.PagoInclude;

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly comprobantes: ComprobantePagoService,
  ) {}

  private async actor(tx: Prisma.TransactionClient, usuarioId: number) {
    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0)
      throw new UnauthorizedException();
    const usuario = await tx.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nombre: true, activo: true },
    });
    if (!usuario?.activo) throw new UnauthorizedException();
    return usuario;
  }

  // Serializar las escrituras de una cuota evita sobrepagos y eventos duplicados concurrentes.
  private async bloquearCuota(tx: Prisma.TransactionClient, cuotaId: number) {
    await tx.$queryRaw`SELECT "id" FROM "cuotas" WHERE "id" = ${cuotaId} FOR UPDATE`;
  }

  private async pagoParaActualizar(tx: Prisma.TransactionClient, id: number) {
    const referencia = await tx.pago.findUnique({
      where: { id },
      select: { cuotaId: true },
    });
    if (!referencia) throw new NotFoundException('Pago no encontrado');
    await this.bloquearCuota(tx, referencia.cuotaId);
    const pago = await tx.pago.findUnique({
      where: { id },
      include: detallePagoInclude,
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  private async totalConfirmado(tx: Prisma.TransactionClient, cuotaId: number) {
    const total = await tx.pago.aggregate({
      where: { cuotaId, estado: 'CONFIRMADO' },
      _sum: { monto: true },
    });
    return total._sum.monto ?? new Prisma.Decimal(0);
  }

  async create(dto: CreatePagoDto, usuarioId: number) {
    const { pago, cuota } = await this.prisma.$transaction(async (tx) => {
      const usuario = await this.actor(tx, usuarioId);
      await this.bloquearCuota(tx, dto.cuotaId);
      const cuota = await tx.cuota.findUnique({
        where: { id: dto.cuotaId },
        include: { inscripcion: { include: { alumno: true } } },
      });
      if (!cuota) throw new NotFoundException('Cuota no encontrada');
      if (cuota.estado === 'ANULADA')
        throw new ConflictException(
          'No se puede registrar un pago en una cuota anulada',
        );
      const nuevoTotal = (await this.totalConfirmado(tx, cuota.id)).plus(
        dto.monto,
      );
      if (nuevoTotal.greaterThan(cuota.monto))
        throw new ConflictException(
          'El valor del pago supera el monto pendiente de la cuota',
        );
      const pago = await tx.pago.create({
        data: {
          cuotaId: dto.cuotaId,
          monto: dto.monto,
          medio: dto.medio,
          nombrePagador: dto.nombrePagador.trim(),
          observaciones: dto.observaciones,
          ...(dto.fechaPago ? { fechaPago: new Date(dto.fechaPago) } : {}),
          usuarioRegistroId: usuario.id,
          // fechaRegistro se asigna en la base, nunca desde el body ni desde fechaPago.
        },
        include: registroPagoInclude,
      });
      await tx.pagoEvento.create({
        data: {
          pagoId: pago.id,
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          accion: 'CREADO',
          nuevo: snapshotPago(pago),
        },
      });
      await tx.cuota.update({
        where: { id: cuota.id },
        data: {
          estado: nuevoTotal.equals(cuota.monto) ? 'PAGADA' : 'PAGO_PARCIAL',
        },
      });
      return { pago, cuota };
    });

    // La confirmación existente se envía después del commit.
    const alumno = cuota.inscripcion.alumno;
    if (alumno.email) {
      try {
        const comprobante = await this.comprobantes.generar(pago.id);
        await this.emailService.sendPaymentConfirmation({
          comprobante,
          alumnoEmail: alumno.email,
          alumnoNombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
          cuotaInfo: `${cuota.concepto} - ${cuota.periodo}`,
          montoPagado: dto.monto,
          medioPago: pago.medio,
          fechaPago: pago.fechaPago,
          nombrePagador: pago.nombrePagador!,
          observaciones: pago.observaciones,
        });
      } catch (error) {
        this.logger.error(
          'Pago registrado correctamente. No se pudo enviar el email de confirmación.',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return pago;
  }

  async update(id: number, dto: UpdatePagoDto, usuarioId: number) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.actor(tx, usuarioId);
      const anterior = await this.pagoParaActualizar(tx, id);
      if (anterior.estado === 'ANULADO')
        throw new ConflictException('No se puede modificar un pago anulado');
      const data: Prisma.PagoUpdateInput = {};
      if (
        dto.nombrePagador !== undefined &&
        dto.nombrePagador.trim() !== anterior.nombrePagador
      )
        data.nombrePagador = dto.nombrePagador.trim();
      if (dto.medio !== undefined && dto.medio !== anterior.medio)
        data.medio = dto.medio;
      if (
        dto.fechaPago !== undefined &&
        new Date(dto.fechaPago).getTime() !== anterior.fechaPago.getTime()
      )
        data.fechaPago = new Date(dto.fechaPago);
      if (
        dto.observaciones !== undefined &&
        dto.observaciones !== anterior.observaciones
      )
        data.observaciones = dto.observaciones;
      if (!Object.keys(data).length) return anterior;
      const pago = await tx.pago.update({
        where: { id },
        data,
        include: detallePagoInclude,
      });
      await tx.pagoEvento.create({
        data: {
          pagoId: id,
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          accion: 'MODIFICADO',
          anterior: snapshotPago(anterior),
          nuevo: snapshotPago(pago),
        },
      });
      return pago;
    });
  }

  async anular(id: number, motivo: string, usuarioId: number) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.actor(tx, usuarioId);
      const anterior = await this.pagoParaActualizar(tx, id);
      if (anterior.estado === 'ANULADO') return anterior;
      const pago = await tx.pago.update({
        where: { id },
        data: { estado: 'ANULADO' },
        include: detallePagoInclude,
      });
      await tx.pagoEvento.create({
        data: {
          pagoId: id,
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          accion: 'ANULADO',
          anterior: snapshotPago(anterior),
          nuevo: snapshotPago(pago),
          motivo: motivo.trim(),
        },
      });
      const total = await this.totalConfirmado(tx, anterior.cuotaId);
      const estado = this.estadoTrasAnulacion(anterior.cuota, total);
      const cuota = await tx.cuota.update({
        where: { id: anterior.cuotaId },
        data: { estado },
      });
      return { ...pago, cuota: { ...pago.cuota, estado: cuota.estado } };
    });
  }

  private estadoTrasAnulacion(cuota: Cuota, total: Prisma.Decimal) {
    if (cuota.estado === 'ANULADA') return 'ANULADA';
    if (total.greaterThanOrEqualTo(cuota.monto)) return 'PAGADA';
    if (
      cuota.fechaVencimiento.toISOString().slice(0, 10) <
      diaAcademia(new Date())
    )
      return 'VENCIDA';
    return total.isZero() ? 'PENDIENTE' : 'PAGO_PARCIAL';
  }

  findAll() {
    return this.prisma.pago.findMany({ include: detallePagoInclude });
  }

  async findOne(id: number) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      include: {
        ...detallePagoInclude,
        eventos: { orderBy: [{ fecha: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }
}
