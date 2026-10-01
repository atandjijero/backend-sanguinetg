import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength,IsNotEmpty } from 'class-validator';
import { IsAgeEntre } from '../../common/validators/is-age-entre.decorator';

const STAFF_ROLES = [Role.SUPERADMIN, Role.ADMIN, Role.MEDECIN, Role.AGENT_CNTS] as const;

export class CreateStaffDto {
  @ApiProperty()
    @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value.trim().toLocaleUpperCase('fr-FR') : Number.NaN))
  @IsString({message:'Le nom doit être une chaine de caractère'})
  @IsNotEmpty({message:'Le nom ne doit pas être vide'})
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le nom doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(5,{message:'Le nom doit avoir 5 caractère au minimun'})
  @MaxLength(15, {message:'Caractère maximun 15'})
  nom: string;

  @ApiProperty()
    @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value.trim().toLocaleLowerCase('fr-FR') : Number.NaN))
  @IsString({message:'Le prénom doit être une chaine de caractère'})
  @IsNotEmpty({message:'Le prénom ne doit pas être vide'})
  @Matches(/^(?=.*\p{L})[\p{L} .'-]+$/u, {
    message: 'Le prénom doit contenir uniquement des lettres, espaces, apostrophes ou tirets',
  })
  @MinLength(5,{message:'Le prénom doit avoir 5 caractère au minimun'})
  @MaxLength(80, {message:'Caractère maximun 80'})
  prenom: string;

  @ApiProperty({ example: '1990-03-21', description: 'Date de naissance (AAAA-MM-JJ)' })
  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  @IsDateString({}, { message: 'La date de naissance doit être une date valide' })
  @IsAgeEntre(18, undefined, { message: 'Le membre du personnel doit avoir au moins 18 ans' })
  dateNaissance: string;

  @ApiProperty()
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsEmail({},{message:'Email doit être valide'})
  @IsNotEmpty({message:'Email ne doit pas être vide'})
  email: string;

  @ApiProperty({ example: '+22890123456' })
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsString()
  @Matches(/^(\+228)?[0-9]{8}$/, {
    message: 'Le numéro de téléphone doit être un numéro togolais valide',
  })
  telephone: string;

  @ApiProperty({ minLength: 8 })
  @IsNotEmpty({message:'Le mot de passe ne doit pas être vide'})
  @Transform(({ value }) => (value === undefined ? undefined : typeof value === 'string' ? value : Number.NaN))
  @IsString()
  @MinLength(8, {message:'Le mot de passe doit contenir au moins 8 caractères'})
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial',
  })
  motDePasse: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsEnum(STAFF_ROLES)
  role: (typeof STAFF_ROLES)[number];
}
