import { ApiProperty } from '@nestjs/swagger';
import { GroupeSanguin } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateGroupeSanguinDto {
  @ApiProperty({ enum: GroupeSanguin })
  @IsEnum(GroupeSanguin, { message: 'Le groupe sanguin sélectionné est invalide' })
  groupeSanguin: GroupeSanguin;
}
