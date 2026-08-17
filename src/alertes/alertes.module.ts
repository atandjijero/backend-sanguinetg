import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../common/mail/mail.module';
import { PushModule } from '../common/push/push.module';
import { CacheModule } from '../common/cache/cache.module';
import { AlertesController } from './alertes.controller';
import { AlertesService } from './alertes.service';

@Module({
  imports: [MailModule, PushModule, CacheModule, JwtModule.register({})],
  controllers: [AlertesController],
  providers: [AlertesService],
  exports: [AlertesService],
})
export class AlertesModule {}
