import { ApiProperty } from '@nestjs/swagger';
import { StatutUtilisateur } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStatutDto {
  @ApiProperty({ enum: StatutUtilisateur })
  @IsEnum(StatutUtilisateur)
  statut: StatutUtilisateur;
}
