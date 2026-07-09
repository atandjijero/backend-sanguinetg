import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  prenom?: string;

  @ApiPropertyOptional({ enum: GroupeSanguin })
  @IsOptional()
  @IsEnum(GroupeSanguin)
  groupeSanguin?: GroupeSanguin;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quartierId?: string;
}
