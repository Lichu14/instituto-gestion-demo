import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

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

  @ApiProperty({
    example: 7,
    required: false,
    minimum: 3,
    maximum: 12,
    default: 3,
    description:
      'Mes de inicio de las mensualidades (marzo=3 a diciembre=12). Solo al omitir la propiedad se utiliza marzo. No se persiste ni cambia la matrícula.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(3)
  @Max(12)
  mesInicio?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;
}
