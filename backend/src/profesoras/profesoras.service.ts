import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfesoraDto } from '../dto/create-profesora.dto';
import { UpdateProfesoraDto } from '../dto/update-profesora.dto';

@Injectable()
export class ProfesorasService {
  constructor(private readonly prisma: PrismaService) {}

  // POST
  async create(createProfesoraDto: CreateProfesoraDto) {
    return this.prisma.profesora.create({
      data: {
        ...createProfesoraDto,
        fechaIngreso: new Date(createProfesoraDto.fechaIngreso),
      },
    });
  }

  // GET
  async findAll() {
    return this.prisma.profesora.findMany();
  }

  // GET
  async findByName(nombre: string, apellido?: string) {
    return this.prisma.profesora.findMany({
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
  async findOne(id: number) {
    return this.prisma.profesora.findUnique({
      where: {
        id,
      },
    });
  }

  // PATCH
  async update(id: number, updateProfesoraDto: UpdateProfesoraDto) {
    const { fechaIngreso, ...datosProfesora } = updateProfesoraDto;

    return this.prisma.profesora.update({
      where: {
        id,
      },
      data: {
        ...datosProfesora,
        ...(fechaIngreso && {
          fechaIngreso: new Date(fechaIngreso),
        }),
      },
    });
  }
}
