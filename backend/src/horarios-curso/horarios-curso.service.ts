import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHorarioCursoDto } from '../dto/create-horario-curso.dto';
import { UpdateHorarioCursoDto } from '../dto/update-horario-curso.dto';

@Injectable()
export class HorariosCursoService {
  constructor(private readonly prisma: PrismaService) {}

  // POST
  async create(cursoId: number, createHorarioDto: CreateHorarioCursoDto) {
    return this.prisma.horarioCurso.create({
      data: {
        ...createHorarioDto,
        cursoId,
      },
    });
  }

  // GET
  async findAllByCurso(cursoId: number) {
    return this.prisma.horarioCurso.findMany({
      where: {
        cursoId,
      },
    });
  }

  // PATCH
  async update(
    cursoId: number,
    horarioId: number,
    updateHorarioDto: UpdateHorarioCursoDto,
  ) {
    const horario = await this.prisma.horarioCurso.findFirst({
      where: {
        id: horarioId,
        cursoId,
      },
    });

    if (!horario) {
      throw new NotFoundException('El horario no pertenece al curso indicado');
    }

    return this.prisma.horarioCurso.update({
      where: {
        id: horarioId,
      },
      data: updateHorarioDto,
    });
  }

  // DELETE
  async remove(cursoId: number, horarioId: number) {
    const horario = await this.prisma.horarioCurso.findFirst({
      where: {
        id: horarioId,
        cursoId,
      },
    });

    if (!horario) {
      throw new NotFoundException('El horario no pertenece al curso indicado');
    }

    return this.prisma.horarioCurso.delete({
      where: {
        id: horarioId,
      },
    });
  }
}
