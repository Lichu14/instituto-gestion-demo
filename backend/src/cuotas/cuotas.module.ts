import { Module } from '@nestjs/common';
import { CuotasController } from './cuotas.controller';
import { CuotasService } from './cuotas.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CuotasController],
  providers: [CuotasService],
})
export class CuotasModule {}
