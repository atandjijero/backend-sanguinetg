import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNotFutureDate } from '../../common/validators/is-not-future-date.decorator';

export class CreateCarnetDto {
  @ApiProperty({ description: 'Identifiant du donneur' })
  @IsString()
  donneurId: string;

  @ApiProperty({ example: '2026-07-09' })
  @IsDateString()
  @IsNotFutureDate({ message: 'La date du don ne peut pas être dans le futur' })
  dateDon: string;

  @ApiProperty({ description: 'Identifiant du centre de don' })
  @IsString()
  centreDonId: string;

  @ApiPropertyOptional({ example: 'Merci pour ce don qui a sauvé une vie !' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  messageRemerciement?: string;

  @ApiPropertyOptional({
    description: 'Date de rappel pour le prochain don. Par défaut : dateDon + 90 jours (délai réglementaire minimal).',
  })
  @IsOptional()
  @IsDateString()
  rappelProchaineDate?: string;

  @ApiPropertyOptional({ description: 'Réponse « Je viens » à l\'origine de ce don' })
  @IsOptional()
  @IsString()
  reponseId?: string;
}
