import { Module } from '@nestjs/common';
import { MailModule } from '../common/mail/mail.module';
import { PushModule } from '../common/push/push.module';
import { RecompensesController } from './recompenses.controller';
import { RecompensesService } from './recompenses.service';

@Module({
  imports: [MailModule, PushModule],
  controllers: [RecompensesController],
  providers: [RecompensesService],
  exports: [RecompensesService],
})
export class RecompensesModule {}
