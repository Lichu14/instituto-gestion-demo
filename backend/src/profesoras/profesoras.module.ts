import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfesorasController } from './profesoras.controller';
import { ProfesorasService } from './profesoras.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfesorasController],
  providers: [ProfesorasService],
})
export class ProfesorasModule {}
