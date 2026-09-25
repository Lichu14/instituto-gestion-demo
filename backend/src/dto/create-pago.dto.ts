import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { MedioPago } from '../../generated/prisma/enums';

export class CreatePagoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  cuotaId!: number;

  @ApiProperty({ example: 50000 })
  @IsPositive()
  monto!: number;

  @ApiProperty({ enum: MedioPago, example: 'EFECTIVO' })
  @IsEnum(MedioPago)
  medio!: MedioPago;

  @ApiProperty({ example: 'María González', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  nombrePagador!: string;

  @ApiPropertyOptional({
    description: 'Momento en que ocurrió el pago; no es la fecha de registro.',
    format: 'date-time',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  fechaPago?: string;

  @ApiPropertyOptional({ example: 'Pago realizado en efectivo' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
