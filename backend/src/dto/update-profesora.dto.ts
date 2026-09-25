import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator';
import { EstadoProfesora } from '../../generated/prisma/enums';

export class UpdateProfesoraDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsOptional()
  @Matches(/^\d{7,8}$/, { message: 'dni debe tener 7 u 8 dígitos' })
  dni?: string;

  @IsOptional()
  @Matches(/^\d{6,15}$/, { message: 'telefono inválido' })
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsEnum(EstadoProfesora)
  estado?: EstadoProfesora;
}
