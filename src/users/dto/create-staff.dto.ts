import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const STAFF_ROLES = [Role.SUPERADMIN, Role.ADMIN, Role.MEDECIN, Role.AGENT_CNTS] as const;

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  prenom: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+22890123456' })
  @Matches(/^(\+228)?[0-9]{8}$/, {
    message: 'Le numéro de téléphone doit être un numéro togolais valide',
  })
  telephone: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre',
  })
  motDePasse: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsEnum(STAFF_ROLES)
  role: (typeof STAFF_ROLES)[number];
}
