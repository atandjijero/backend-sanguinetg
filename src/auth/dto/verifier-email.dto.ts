import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifierEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}
