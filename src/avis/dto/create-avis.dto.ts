import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAvisDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  note: number;

  @ApiPropertyOptional({ example: 'Les conseils avant/après don sont très clairs.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaire?: string;
}
