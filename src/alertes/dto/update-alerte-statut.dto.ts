import { ApiProperty } from '@nestjs/swagger';
import { StatutAlerte } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAlerteStatutDto {
  @ApiProperty({ enum: StatutAlerte })
  @IsEnum(StatutAlerte)
  statut: StatutAlerte;
}
