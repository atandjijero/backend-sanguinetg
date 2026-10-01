import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../common/validators/match.decorator';
import {
  AGE_MAX_DON,
  AGE_MIN_DON,
  IsAgeEntre,
} from '../../common/validators/is-age-entre.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'Atandji' })
    @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value.trim().toLocaleUpperCase('fr-FR') : Number.NaN))
  @IsString()
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le nom doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(2)
  @MaxLength(80)
  nom: string;

  @ApiProperty({ example: 'Jérôme' })
    @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value.trim().toLocaleLowerCase('fr-FR') : Number.NaN))
  @IsString()
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le prénom doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(2)
  @MaxLength(80)
  prenom: string;

  @ApiProperty({ example: '1998-05-14', description: 'Date de naissance (AAAA-MM-JJ), âge légal du don : 18 à 65 ans' })
  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString({}, { message: 'La date de naissance doit être une date valide' })
  @IsAgeEntre(AGE_MIN_DON, AGE_MAX_DON, {
    message: `Le don de sang est ouvert aux personnes de ${AGE_MIN_DON} à ${AGE_MAX_DON} ans`,
  })
  dateNaissance: string;

  @ApiProperty({ example: 'donneur@example.com' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+22890123456' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsString()
  @Matches(/^(\+228)?[0-9]{8}$/, {
    message:
      'Le numéro de téléphone doit être un numéro togolais valide (8 chiffres, préfixe +228 optionnel)',
  })
  telephone: string;

  @ApiProperty({ example: 'MotDePasse2024', minLength: 8 })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre',
  })
  motDePasse: string;

  @ApiProperty({ example: 'MotDePasse2024' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsString()
  @Match('motDePasse', {
    message: 'La confirmation ne correspond pas au mot de passe',
  })
  confirmationMotDePasse: string;

  @ApiPropertyOptional({ enum: GroupeSanguin })
  @IsOptional()
  @IsEnum(GroupeSanguin)
  groupeSanguin?: GroupeSanguin;

  @ApiPropertyOptional({ description: 'Identifiant du quartier (Lomé)' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsOptional()
  @IsString()
  quartierId?: string;

  @ApiProperty({
    example: true,
    description:
      "Consentement explicite à l'utilisation des informations du donneur pour être contacté lors d'urgences de don compatibles.",
  })
  @IsBoolean()
  @Equals(true, {
    message:
      "Vous devez accepter l'utilisation de vos informations pour vous inscrire.",
  })
  consentement: boolean;
}
