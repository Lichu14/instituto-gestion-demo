import {
  IsString,
  IsPositive,
  IsInt,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { EstadoCurso } from '../../generated/prisma/enums';

export class UpdateCursoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsPositive()
  precioMensual?: number;

  @IsOptional()
  @IsPositive()
  precioMatricula?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  profesoraId?: number;

  @IsOptional()
  @IsEnum(EstadoCurso)
  estado?: EstadoCurso;
}
