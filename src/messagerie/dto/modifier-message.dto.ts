import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ModifierMessageDto {
  @ApiProperty({ example: 'Bonjour docteur, en fait ma question portait sur les crampes après le don.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  contenu: string;
}
