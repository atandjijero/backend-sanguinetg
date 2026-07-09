import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TypeRecompense } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRecompenseDto {
  @ApiProperty({ description: 'Identifiant du donneur bénéficiaire' })
  @IsString()
  donneurId: string;

  @ApiProperty({ enum: TypeRecompense })
  @IsEnum(TypeRecompense)
  type: TypeRecompense;

  @ApiProperty({ example: 'Kit de vivres (riz, huile, conserves)' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  description: string;

  @ApiPropertyOptional({ example: '3 dons effectués en 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  critereAttribution?: string;
}
