import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CuotasService } from './cuotas.service';
import { UpdateCuotaDto } from '../dto/update-cuota.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('cuotas')
export class CuotasController {
  constructor(private readonly cuotasService: CuotasService) {}

  @Get()
  findAll() {
    return this.cuotasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cuotasService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCuotaDto: UpdateCuotaDto) {
    return this.cuotasService.update(Number(id), updateCuotaDto);
  }
}
