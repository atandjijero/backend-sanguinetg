import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin, StatutAlerte } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindAlertesQuery {
  @ApiPropertyOptional({ enum: StatutAlerte })
  @IsOptional()
  @IsEnum(StatutAlerte)
  statut?: StatutAlerte;

  @ApiPropertyOptional({ enum: GroupeSanguin })
  @IsOptional()
  @IsEnum(GroupeSanguin)
  groupeSanguinRequis?: GroupeSanguin;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quartierId?: string;
}
