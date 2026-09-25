import { Module } from '@nestjs/common';
import { HorariosCursoService } from './horarios-curso.service';
import { HorariosCursoController } from './horarios-curso.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HorariosCursoController],
  providers: [HorariosCursoService],
})
export class HorariosCursoModule {}
