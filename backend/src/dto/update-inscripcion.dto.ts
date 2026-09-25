import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateInscripcionDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  año?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  descuentoPorcentaje?: number;
}
