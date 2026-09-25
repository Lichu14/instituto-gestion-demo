import { IsEnum, IsOptional, Matches } from 'class-validator';
import { DiaSemana } from '../../generated/prisma/enums';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateHorarioCursoDto {
  @IsOptional()
  @IsEnum(DiaSemana)
  diaSemana?: DiaSemana;

  @IsOptional()
  @Matches(HORA_REGEX, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio?: string;

  @IsOptional()
  @Matches(HORA_REGEX, { message: 'horaFin debe tener formato HH:mm' })
  horaFin?: string;
}
