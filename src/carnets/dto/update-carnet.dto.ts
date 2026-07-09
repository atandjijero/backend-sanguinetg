import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCarnetDto {
  @ApiPropertyOptional({ description: 'Identifiant du centre de don' })
  @IsOptional()
  @IsString()
  centreDonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  messageRemerciement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  rappelProchaineDate?: string;

  @ApiPropertyOptional({ description: 'Récompense à associer à ce don (vivres, transport, badge...)' })
  @IsOptional()
  @IsString()
  recompenseId?: string;
}
