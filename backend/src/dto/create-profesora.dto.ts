import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator';

export class CreateProfesoraDto {
  @ApiProperty({ example: 'María' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @ApiProperty({ example: '30123456' })
  @Matches(/^\d{7,8}$/, { message: 'dni debe tener 7 u 8 dígitos' })
  dni!: string;

  @ApiProperty({ example: '1123456789' })
  @Matches(/^\d{6,15}$/, { message: 'telefono inválido' })
  telefono!: string;

  @ApiPropertyOptional({ example: 'maria.gonzalez@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '2024-03-01',
    description:
      'Fecha en la que la profesora comenzó a trabajar en el instituto',
  })
  @IsDateString()
  fechaIngreso!: string;
}
