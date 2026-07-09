import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCentreDonDto {
  @ApiProperty({ example: 'CNTS Lomé - Site central' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nom: string;

  @ApiPropertyOptional({ example: 'Boulevard du 13 Janvier, Lomé' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  adresse?: string;

  @ApiPropertyOptional({ description: 'Quartier de rattachement (aide au géocodage automatique si les coordonnées sont omises)' })
  @IsOptional()
  @IsString()
  quartierId?: string;

  @ApiPropertyOptional({ example: 6.1319 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 1.2228 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
