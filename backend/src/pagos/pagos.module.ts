import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ComprobantePagoService } from './comprobante-pago.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PagosController],
  providers: [PagosService, ComprobantePagoService],
})
export class PagosModule {}
