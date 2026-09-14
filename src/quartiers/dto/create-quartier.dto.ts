import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateQuartierDto {
  @ApiProperty({ example: 'Bè' })
    @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value.trim().toLocaleUpperCase('fr-FR') : Number.NaN))
  @IsString()
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le nom du quartier doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(2)
  @MaxLength(80)
  nom: string;

  @ApiPropertyOptional({ example: 6.1256 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 1.2437 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
