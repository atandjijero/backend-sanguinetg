import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin } from '@prisma/client';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class RegisterDto {
  @ApiProperty({ example: 'Atandji' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom: string;

  @ApiProperty({ example: 'Jérôme' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  prenom: string;

  @ApiProperty({ example: 'donneur@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+22890123456' })
  @Matches(/^(\+228)?[0-9]{8}$/, {
    message:
      'Le numéro de téléphone doit être un numéro togolais valide (8 chiffres, préfixe +228 optionnel)',
  })
  telephone: string;

  @ApiProperty({ example: 'MotDePasse2024', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre',
  })
  motDePasse: string;

  @ApiProperty({ example: 'MotDePasse2024' })
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
