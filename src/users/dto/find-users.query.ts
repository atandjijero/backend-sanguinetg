import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin, Role } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FindUsersQuery {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: GroupeSanguin })
  @IsOptional()
  @IsEnum(GroupeSanguin)
  groupeSanguin?: GroupeSanguin;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quartierId?: string;
}
