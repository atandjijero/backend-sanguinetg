import { Module } from '@nestjs/common';
import { CarnetsController } from './carnets.controller';
import { CarnetsService } from './carnets.service';

@Module({
  controllers: [CarnetsController],
  providers: [CarnetsService],
  exports: [CarnetsService],
})
export class CarnetsModule {}
