import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString } from 'class-validator';

export class TraduireDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  textes: string[];

  @IsIn(['EN', 'FR'])
  langueCible: 'EN' | 'FR';
}
