import { ApiPropertyOptional } from '@nestjs/swagger';
import { GraviteAlerteSecurite, TypeAlerteSecurite } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAlertesSecuriteQuery {
  @ApiPropertyOptional({ enum: TypeAlerteSecurite })
  @IsOptional()
  @IsEnum(TypeAlerteSecurite)
  type?: TypeAlerteSecurite;

  @ApiPropertyOptional({ enum: GraviteAlerteSecurite })
  @IsOptional()
  @IsEnum(GraviteAlerteSecurite)
  gravite?: GraviteAlerteSecurite;

  @ApiPropertyOptional({ description: 'Recherche libre (IP, message, URI)' })
  @IsOptional()
  @IsString()
  recherche?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 5;
}
