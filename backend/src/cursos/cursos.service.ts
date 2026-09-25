import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCursoDto } from '../dto/create-curso.dto';
import { UpdateCursoDto } from '../dto/update-curso.dto';

@Injectable()
export class CursosService {
  constructor(private readonly prisma: PrismaService) {}

  // POST
  async create(createCursoDto: CreateCursoDto) {
    const { horarios, ...datosCurso } = createCursoDto;

    return this.prisma.curso.create({
      data: {
        ...datosCurso,
        horarios: {
          create: horarios,
        },
      },
      include: {
        profesora: true,
        horarios: true,
      },
    });
  }

  // GET
  async findAll() {
    return this.prisma.curso.findMany({
      include: {
        profesora: true,
        horarios: true,
      },
    });
  }

  // GET
  async findOne(id: number) {
    return this.prisma.curso.findUnique({
      where: {
        id,
      },
      include: {
        profesora: true,
        horarios: true,
      },
    });
  }

  // GET
  async findByName(nombre: string) {
    return this.prisma.curso.findMany({
      where: {
        nombre: {
          contains: nombre,
          mode: 'insensitive',
        },
      },
      include: {
        profesora: true,
        horarios: true,
      },
    });
  }

  // PATCH
  async update(id: number, updateCursoDto: UpdateCursoDto) {
    return this.prisma.curso.update({
      where: {
        id,
      },
      data: updateCursoDto,
      include: {
        profesora: true,
        horarios: true,
      },
    });
  }
}
