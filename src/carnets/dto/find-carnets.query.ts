import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindCarnetsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  donneurId?: string;
}
