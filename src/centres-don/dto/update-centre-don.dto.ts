import { PartialType } from '@nestjs/swagger';
import { CreateCentreDonDto } from './create-centre-don.dto';

export class UpdateCentreDonDto extends PartialType(CreateCentreDonDto) {}
