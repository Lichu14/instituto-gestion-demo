import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import { CreateInscripcionDto } from '../dto/create-inscripcion.dto';
import { UpdateInscripcionDto } from '../dto/update-inscripcion.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('inscripciones')
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  // POST /inscripciones
  @Post()
  create(@Body() createInscripcionDto: CreateInscripcionDto) {
    return this.inscripcionesService.create(createInscripcionDto);
  }

  // GET /inscripciones
  @Get()
  findAll() {
    return this.inscripcionesService.findAll();
  }

  // GET /inscripciones/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inscripcionesService.findOne(Number(id));
  }

  // PATCH /inscripciones/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInscripcionDto: UpdateInscripcionDto,
  ) {
    return this.inscripcionesService.update(Number(id), updateInscripcionDto);
  }

  // PATCH /inscripciones/:id/abandonar
  @Patch(':id/abandonar')
  abandonar(@Param('id') id: string) {
    return this.inscripcionesService.abandonar(Number(id));
  }

  // PATCH /inscripciones/:id/completar
  @Patch(':id/completar')
  completar(@Param('id') id: string) {
    return this.inscripcionesService.completar(Number(id));
  }
}
