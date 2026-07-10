import { ApiProperty } from '@nestjs/swagger';
import { StatutReponse } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class ReponseEmailDto {
  @ApiProperty({ description: 'Jeton signé reçu dans le lien de réponse par email' })
  @IsString()
  token: string;

  @ApiProperty({ enum: StatutReponse })
  @IsEnum(StatutReponse)
  statut: StatutReponse;
}
