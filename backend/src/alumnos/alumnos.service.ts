import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlumnoDto } from '../dto/create-alumno.dto';
import { UpdateAlumnoDto } from '../dto/update-alumno.dto';
import { proyectarCuota } from './estado-cuenta.util';
import { registroPagoInclude } from '../pagos/pago-auditoria';

@Injectable()
export class AlumnosService {
  constructor(private readonly prisma: PrismaService) {}

  // POST
  async create(createAlumnoDto: CreateAlumnoDto) {
    return this.prisma.alumno.create({
      data: {
        ...createAlumnoDto,
        fechaNacimiento: new Date(createAlumnoDto.fechaNacimiento),
      },
    });
  }

  // GET
  async findAll() {
    return this.prisma.alumno.findMany();
  }

  // GET
  async findByName(nombre: string, apellido?: string) {
    return this.prisma.alumno.findMany({
      where: {
        nombre: {
          contains: nombre,
          mode: 'insensitive',
        },
        ...(apellido && {
          apellido: {
            contains: apellido,
            mode: 'insensitive',
          },
        }),
      },
    });
  }

  // GET
  async findOne(id: number, ahora = new Date()) {
    const alumno = await this.prisma.alumno.findUnique({
      where: {
        id,
      },
      include: {
        inscripciones: {
          include: {
            curso: true,
            cuotas: {
              include: {
                pagos: { include: registroPagoInclude },
              },
            },
          },
        },
      },
    });

    return (
      alumno && {
        ...alumno,
        inscripciones: alumno.inscripciones.map((inscripcion) => ({
          ...inscripcion,
          cuotas: inscripcion.cuotas.map((cuota) =>
            proyectarCuota(cuota, ahora),
          ),
        })),
      }
    );
  }

  // PATCH
  async update(id: number, updateAlumnoDto: UpdateAlumnoDto) {
    return this.prisma.alumno.update({
      where: {
        id,
      },
      data: {
        ...updateAlumnoDto,
        ...(updateAlumnoDto.fechaNacimiento && {
          fechaNacimiento: new Date(updateAlumnoDto.fechaNacimiento),
        }),
        ...(updateAlumnoDto.fechaAlta && {
          fechaAlta: new Date(updateAlumnoDto.fechaAlta),
        }),
      },
    });
  }
}
