import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuartierDto {
  @ApiProperty({ example: 'Bè' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nom: string;

  @ApiPropertyOptional({ example: 6.1256 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: 1.2437 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
