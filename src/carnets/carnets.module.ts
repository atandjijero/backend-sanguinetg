import { Module } from '@nestjs/common';
import { MailModule } from '../common/mail/mail.module';
import { PushModule } from '../common/push/push.module';
import { CacheModule } from '../common/cache/cache.module';
import { CarnetsController } from './carnets.controller';
import { CarnetsService } from './carnets.service';

@Module({
  imports: [MailModule, PushModule, CacheModule],
  controllers: [CarnetsController],
  providers: [CarnetsService],
  exports: [CarnetsService],
})
export class CarnetsModule {}
