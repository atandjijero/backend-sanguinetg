import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DemandeReinitialisationDto {
  @ApiProperty({ description: 'Email ou numéro de téléphone du compte', example: 'donneur@example.com' })
  @IsString()
  identifiant: string;
}
