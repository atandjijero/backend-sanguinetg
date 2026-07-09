import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email ou numéro de téléphone', example: 'donneur@example.com' })
  @IsString()
  identifiant: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  motDePasse: string;
}
