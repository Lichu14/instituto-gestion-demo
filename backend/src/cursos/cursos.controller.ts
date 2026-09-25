import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { CursosService } from './cursos.service';
import { CreateCursoDto } from '../dto/create-curso.dto';
import { UpdateCursoDto } from '../dto/update-curso.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  // POST /cursos
  @Post()
  create(@Body() createCursoDto: CreateCursoDto) {
    return this.cursosService.create(createCursoDto);
  }

  // GET /cursos
  @Get()
  findAll() {
    return this.cursosService.findAll();
  }

  // GET /cursos/name?nombre=Kids
  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
  })
  @Get('name')
  findByName(@Query('nombre') nombre: string) {
    return this.cursosService.findByName(nombre);
  }

  // GET /cursos/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cursosService.findOne(Number(id));
  }

  // PATCH /cursos/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCursoDto: UpdateCursoDto) {
    return this.cursosService.update(Number(id), updateCursoDto);
  }
}
