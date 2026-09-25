import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Req,
  Patch,
  ParseIntPipe,
  Header,
  StreamableFile,
} from '@nestjs/common';
import type { Request } from 'express';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from '../dto/create-pago.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdatePagoDto } from '../dto/update-pago.dto';
import { AnularPagoDto } from '../dto/anular-pago.dto';
import type { JwtStrategy } from '../auth/jwt.strategy';
import { ComprobantePagoService } from './comprobante-pago.service';

type RequestAutenticado = Request & {
  user: Awaited<ReturnType<JwtStrategy['validate']>>;
};

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('pagos')
export class PagosController {
  constructor(
    private readonly pagosService: PagosService,
    private readonly comprobantes: ComprobantePagoService,
  ) {}

  @Post()
  create(
    @Body() createPagoDto: CreatePagoDto,
    @Req() request: RequestAutenticado,
  ) {
    return this.pagosService.create(createPagoDto, request.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePagoDto,
    @Req() request: RequestAutenticado,
  ) {
    return this.pagosService.update(id, dto, request.user.userId);
  }

  @Patch(':id/anular')
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnularPagoDto,
    @Req() request: RequestAutenticado,
  ) {
    return this.pagosService.anular(id, dto.motivo, request.user.userId);
  }

  @Get()
  findAll() {
    return this.pagosService.findAll();
  }

  @Get(':id/comprobante.pdf')
  @Header('Cache-Control', 'private, no-store')
  @Header('Access-Control-Expose-Headers', 'Content-Disposition')
  async descargarComprobante(@Param('id', ParseIntPipe) id: number) {
    const pdf = await this.comprobantes.generar(id);
    return new StreamableFile(pdf.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${pdf.filename}"`,
      length: pdf.buffer.length,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosService.findOne(Number(id));
  }
}
