import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategorieConseil } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class FindConseilsQuery {
  @ApiPropertyOptional({ enum: CategorieConseil })
  @IsOptional()
  @IsEnum(CategorieConseil)
  categorie?: CategorieConseil;
}
