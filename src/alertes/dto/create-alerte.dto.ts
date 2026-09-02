import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupeSanguin } from '@prisma/client';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsPositiveIntegerRecord } from '../../common/validators/positive-integer-record.decorator';

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

  @ApiProperty({
    type: [String],
    description:
      'Un ou plusieurs centres de collecte. Si plusieurs sont choisis pour un même quartier, chaque donneur éligible est orienté vers le centre sélectionné le plus proche (jamais notifié pour plusieurs).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  centreDonIds: string[];

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  rayonKm?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'number' },
    description:
      'Nombre maximum de donneurs à notifier, par quartier ciblé (clé = quartierId). Priorité aux donneurs les plus proches du centre sélectionné le plus proche. Omis = tous les donneurs compatibles de ce quartier.',
  })
  @IsOptional()
  @IsPositiveIntegerRecord({
    message: 'nombreDonneursMaxParQuartier doit être un objet dont chaque valeur est un entier >= 1',
  })
  nombreDonneursMaxParQuartier?: Record<string, number>;
}
