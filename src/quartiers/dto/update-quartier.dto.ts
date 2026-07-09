import { PartialType } from '@nestjs/swagger';
import { CreateQuartierDto } from './create-quartier.dto';

export class UpdateQuartierDto extends PartialType(CreateQuartierDto) {}
