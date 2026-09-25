import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsOptional, Min, Max } from 'class-validator';

export class CreateInscripcionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  alumnoId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  cursoId!: number;

  @ApiProperty({ example: 2027 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  año!: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;
}
