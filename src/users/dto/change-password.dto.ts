import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  ancienMotDePasse: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre',
  })
  nouveauMotDePasse: string;

  @ApiProperty()
  @IsString()
  @Match('nouveauMotDePasse', { message: 'La confirmation ne correspond pas au nouveau mot de passe' })
  confirmationNouveauMotDePasse: string;
}
