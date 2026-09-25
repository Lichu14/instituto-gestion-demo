import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsEmail,
  Matches,
} from 'class-validator';
import { EstadoAlumno } from '../../generated/prisma/enums';

export class UpdateAlumnoDto {
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
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @Matches(/^\d{6,15}$/, { message: 'telefono inválido' })
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(EstadoAlumno)
  estado?: EstadoAlumno;

  @IsOptional()
  @IsDateString()
  fechaAlta?: string;
}
