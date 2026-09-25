import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, Matches } from 'class-validator';
import { DiaSemana } from '../../generated/prisma/enums';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateHorarioCursoDto {
  @ApiProperty({
    enum: DiaSemana,
    example: 'LUNES',
  })
  @IsEnum(DiaSemana)
  diaSemana!: DiaSemana;

  @ApiProperty({
    example: '18:00',
  })
  @Matches(HORA_REGEX, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio!: string;

  @ApiProperty({
    example: '19:30',
  })
  @Matches(HORA_REGEX, { message: 'horaFin debe tener formato HH:mm' })
  horaFin!: string;
}
