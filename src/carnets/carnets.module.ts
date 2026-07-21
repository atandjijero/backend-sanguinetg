import { Module } from '@nestjs/common';
import { MailModule } from '../common/mail/mail.module';
import { PushModule } from '../common/push/push.module';
import { CarnetsController } from './carnets.controller';
import { CarnetsService } from './carnets.service';

@Module({
  imports: [MailModule, PushModule],
  controllers: [CarnetsController],
  providers: [CarnetsService],
  exports: [CarnetsService],
})
export class CarnetsModule {}
