import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class DeconnexionDto {
  @ApiProperty({ description: 'Identifiant de session généré côté client (persisté en localStorage)' })
  @IsString()
  @MaxLength(100)
  sessionId: string;
}
