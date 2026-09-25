import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HorariosCursoService } from './horarios-curso.service';
import { CreateHorarioCursoDto } from '../dto/create-horario-curso.dto';
import { UpdateHorarioCursoDto } from '../dto/update-horario-curso.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('cursos/:cursoId/horarios')
export class HorariosCursoController {
  constructor(private readonly horariosCursoService: HorariosCursoService) {}

  // POST /cursos/:cursoId/horarios
  @Post()
  create(
    @Param('cursoId') cursoId: string,
    @Body() createHorarioDto: CreateHorarioCursoDto,
  ) {
    return this.horariosCursoService.create(Number(cursoId), createHorarioDto);
  }

  // GET /cursos/:cursoId/horarios
  @Get()
  findAllByCurso(@Param('cursoId') cursoId: string) {
    return this.horariosCursoService.findAllByCurso(Number(cursoId));
  }

  // PATCH /cursos/:cursoId/horarios/:horarioId
  @Patch(':horarioId')
  update(
    @Param('cursoId') cursoId: string,
    @Param('horarioId') horarioId: string,
    @Body() updateHorarioDto: UpdateHorarioCursoDto,
  ) {
    return this.horariosCursoService.update(
      Number(cursoId),
      Number(horarioId),
      updateHorarioDto,
    );
  }

  // DELETE /cursos/:cursoId/horarios/:horarioId
  @Delete(':horarioId')
  remove(
    @Param('cursoId') cursoId: string,
    @Param('horarioId') horarioId: string,
  ) {
    return this.horariosCursoService.remove(Number(cursoId), Number(horarioId));
  }
}
