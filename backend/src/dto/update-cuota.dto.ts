import { IsEnum, IsOptional } from 'class-validator';
import { EstadoCuota } from '../../generated/prisma/enums';

export class UpdateCuotaDto {
  @IsOptional()
  @IsEnum(EstadoCuota)
  estado?: EstadoCuota;
}
