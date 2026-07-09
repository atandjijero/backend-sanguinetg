import { ApiProperty } from '@nestjs/swagger';
import { CategorieConseil } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConseilDto {
  @ApiProperty({ example: 'Bien se préparer avant de donner son sang' })
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  titre: string;

  @ApiProperty({ example: 'Buvez suffisamment d\'eau, mangez avant le don, dormez bien la veille...' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  contenu: string;

  @ApiProperty({ enum: CategorieConseil })
  @IsEnum(CategorieConseil)
  categorie: CategorieConseil;
}
