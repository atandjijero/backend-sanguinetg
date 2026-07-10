import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatutMessageContact } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class FindMessagesContactQuery {
  @ApiPropertyOptional({ enum: StatutMessageContact })
  @IsOptional()
  @IsEnum(StatutMessageContact)
  statut?: StatutMessageContact;
}
