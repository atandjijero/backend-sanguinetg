import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatutRecompense, TypeRecompense } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindRecompensesQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  donneurId?: string;

  @ApiPropertyOptional({ enum: TypeRecompense })
  @IsOptional()
  @IsEnum(TypeRecompense)
  type?: TypeRecompense;

  @ApiPropertyOptional({ enum: StatutRecompense })
  @IsOptional()
  @IsEnum(StatutRecompense)
  statut?: StatutRecompense;
}
