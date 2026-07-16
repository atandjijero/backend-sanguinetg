import { Module } from '@nestjs/common';
import { TraductionController } from './traduction.controller';
import { TraductionService } from './traduction.service';

@Module({
  controllers: [TraductionController],
  providers: [TraductionService],
})
export class TraductionModule {}
