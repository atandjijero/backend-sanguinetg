import { Module } from '@nestjs/common';
import { RecompensesController } from './recompenses.controller';
import { RecompensesService } from './recompenses.service';

@Module({
  controllers: [RecompensesController],
  providers: [RecompensesService],
  exports: [RecompensesService],
})
export class RecompensesModule {}
