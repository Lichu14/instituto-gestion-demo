import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class AnularPagoDto {
  @ApiProperty({ example: 'Registro duplicado', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  motivo!: string;
}
