import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageContactDto {
  @ApiProperty({ example: 'Aimé Djinékou' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nomComplet: string;

  @ApiProperty({ example: 'aime@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Question sur le don de sang' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  sujet: string;

  @ApiProperty({ example: 'Bonjour, je voudrais savoir...' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message: string;
}
