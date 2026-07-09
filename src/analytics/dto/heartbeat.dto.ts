import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class HeartbeatDto {
  @ApiProperty({ description: 'Identifiant de session généré côté client (persisté en localStorage)' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Chemin de la page actuellement consultée' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  chemin?: string;
}
