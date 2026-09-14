import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCentreDonDto {
  @ApiProperty({ example: 'CNTS Lomé - Site central' })
    @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value.trim().toLocaleUpperCase('fr-FR') : Number.NaN))
  @IsString()
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le nom du centre doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(2)
  @MaxLength(150)
  nom: string;

  @ApiPropertyOptional({ example: 'Boulevard du 13 Janvier, Lomé' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  adresse?: string;

  @ApiPropertyOptional({ description: 'Quartier de rattachement (aide au géocodage automatique si les coordonnées sont omises)' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
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
