import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class EnvoyerMessageVocalDto {
  @ApiPropertyOptional({ description: 'Requis côté médecin pour identifier la conversation du donneur concerné.' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ example: 12, description: 'Durée de l’enregistrement en secondes.' })
  @IsInt()
  @Min(1)
  @Max(600)
  dureeSecondes: number;
}
