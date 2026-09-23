import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RemoveStaffDto {
  @ApiProperty({
    description: 'Motif obligatoire de la suppression du membre CNTS',
    example: 'Départ définitif du CNTS',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  raison: string;
}
