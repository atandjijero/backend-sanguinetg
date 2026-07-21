import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class EnvoyerMessageDto {
  @ApiProperty({ example: 'Bonjour docteur, est-ce que je peux donner mon sang si je prends un traitement ?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  contenu: string;

  @ApiPropertyOptional({ description: 'Requis côté médecin pour identifier la conversation du donneur concerné.' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
