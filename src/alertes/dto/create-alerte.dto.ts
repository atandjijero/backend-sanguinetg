import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin } from '@prisma/client';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAlerteDto {
  @ApiProperty({
    enum: GroupeSanguin,
    isArray: true,
    description: 'Un ou plusieurs groupes sanguins requis — une alerte est créée par combinaison groupe × quartier',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(GroupeSanguin, { each: true })
  groupesSanguinsRequis: GroupeSanguin[];

  @ApiProperty({ type: [String], description: 'Un ou plusieurs quartiers ciblés (Lomé)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  quartierIds: string[];

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  rayonKm?: number;
}
