import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class DeleteAlertesSecuriteDto {
  @ApiProperty({ type: [String], description: 'Identifiants des alertes de sécurité à supprimer' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  ids: string[];
}
