import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyMessageContactDto {
  @ApiProperty({ example: 'Bonjour, merci pour votre message. Le CNTS...' })
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  reponse: string;
}
