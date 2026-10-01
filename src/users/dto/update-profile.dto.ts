import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsAgeEntre } from '../../common/validators/is-age-entre.decorator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLocaleUpperCase('fr-FR') : value))
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le nom doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(2)
  @MaxLength(80)
  nom?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLocaleLowerCase('fr-FR') : value))
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le prénom doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(2)
  @MaxLength(80)
  prenom?: string;

  @ApiPropertyOptional({ example: '+22890123456' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+228)?[0-9]{8}$/, {
    message:
      'Le numéro de téléphone doit être un numéro togolais valide (8 chiffres, préfixe +228 optionnel)',
  })
  telephone?: string;

  @ApiPropertyOptional({ example: '1998-05-14', description: 'Date de naissance (AAAA-MM-JJ)' })
  @IsOptional()
  @IsDateString({}, { message: 'La date de naissance doit être une date valide' })
  @IsAgeEntre(18, undefined, { message: 'Vous devez avoir au moins 18 ans' })
  dateNaissance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quartierId?: string;
}
