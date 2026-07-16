import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAbonneDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nom: string;

  @ApiProperty()
  @IsEmail()
  email: string;
}
