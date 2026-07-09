import { ApiProperty } from '@nestjs/swagger';
import { StatutRecompense } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRecompenseStatutDto {
  @ApiProperty({ enum: StatutRecompense })
  @IsEnum(StatutRecompense)
  statut: StatutRecompense;
}
