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
import { ProfesorasService } from './profesoras.service';
import { CreateProfesoraDto } from '../dto/create-profesora.dto';
import { UpdateProfesoraDto } from '../dto/update-profesora.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('profesoras')
export class ProfesorasController {
  constructor(private readonly profesorasService: ProfesorasService) {}

  @Post()
  create(@Body() createProfesoraDto: CreateProfesoraDto) {
    return this.profesorasService.create(createProfesoraDto);
  }

  @Get()
  findAll() {
    return this.profesorasService.findAll();
  }

  @ApiQuery({
    name: 'nombre',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'apellido',
    required: false,
    type: String,
  })
  @Get('name')
  findByName(
    @Query('nombre') nombre: string,
    @Query('apellido') apellido?: string,
  ) {
    return this.profesorasService.findByName(nombre, apellido);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profesorasService.findOne(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProfesoraDto: UpdateProfesoraDto,
  ) {
    return this.profesorasService.update(Number(id), updateProfesoraDto);
  }
}
