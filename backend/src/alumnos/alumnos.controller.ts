import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Param,
  Patch,
  UseGuards,
  ParseIntPipe,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AlumnosService } from './alumnos.service';
import { CreateAlumnoDto } from '../dto/create-alumno.dto';
import { UpdateAlumnoDto } from '../dto/update-alumno.dto';
import { EstadoCuentaService } from './estado-cuenta.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('alumnos')
export class AlumnosController {
  constructor(
    private readonly alumnosService: AlumnosService,
    private readonly estadoCuenta: EstadoCuentaService,
  ) {}

  @Get(':id/estado-cuenta.pdf')
  @Header('Cache-Control', 'private, no-store')
  async descargarEstadoCuenta(@Param('id', ParseIntPipe) id: number) {
    const pdf = await this.estadoCuenta.generar(id);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="estado-cuenta-alumno-${id}.pdf"`,
      length: pdf.length,
    });
  }

  @Post()
  create(@Body() createAlumnoDto: CreateAlumnoDto) {
    return this.alumnosService.create(createAlumnoDto);
  }

  @Get()
  findAll() {
    return this.alumnosService.findAll();
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
    return this.alumnosService.findByName(nombre, apellido);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alumnosService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAlumnoDto: UpdateAlumnoDto) {
    return this.alumnosService.update(Number(id), updateAlumnoDto);
  }
}
