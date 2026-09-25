import { Module } from '@nestjs/common';
import { AlumnosController } from './alumnos.controller';
import { AlumnosService } from './alumnos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EstadoCuentaService } from './estado-cuenta.service';

@Module({
  imports: [PrismaModule],
  controllers: [AlumnosController],
  providers: [AlumnosService, EstadoCuentaService],
})
export class AlumnosModule {}
