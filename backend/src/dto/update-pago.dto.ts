import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { MedioPago } from '../../generated/prisma/enums';

// Importe, cuota, estado, autor, timestamp e historial no se aceptan desde el cliente.
export class UpdatePagoDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  nombrePagador?: string;

  @ApiPropertyOptional({ enum: MedioPago })
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(MedioPago)
  medio?: MedioPago;

  @ApiPropertyOptional({ format: 'date-time' })
  @ValidateIf((_, value) => value !== undefined)
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  fechaPago?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  observaciones?: string;
}
