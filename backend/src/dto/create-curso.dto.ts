import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsPositive,
  IsInt,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { CreateHorarioCursoDto } from './create-horario-curso.dto';

export class CreateCursoDto {
  @ApiProperty({
    example: 'Kids 1',
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    example: 50000,
  })
  @IsPositive()
  precioMensual!: number;

  @ApiProperty({
    example: 30000,
  })
  @IsPositive()
  precioMatricula!: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la profesora asignada al curso',
  })
  @IsInt()
  @IsPositive()
  profesoraId!: number;

  @ApiProperty({
    type: [CreateHorarioCursoDto],
    example: [
      {
        diaSemana: 'LUNES',
        horaInicio: '18:00',
        horaFin: '19:30',
      },
      {
        diaSemana: 'MIERCOLES',
        horaInicio: '17:30',
        horaFin: '19:00',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateHorarioCursoDto)
  horarios!: CreateHorarioCursoDto[];
}
