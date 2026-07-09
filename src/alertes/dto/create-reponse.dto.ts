import { ApiProperty } from '@nestjs/swagger';
import { StatutReponse } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateReponseDto {
  @ApiProperty({ enum: StatutReponse })
  @IsEnum(StatutReponse)
  statut: StatutReponse;
}
