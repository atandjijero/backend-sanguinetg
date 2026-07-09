import { PartialType } from '@nestjs/swagger';
import { CreateConseilDto } from './create-conseil.dto';

export class UpdateConseilDto extends PartialType(CreateConseilDto) {}
