import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../common/mail/mail.module';
import { SmsModule } from '../common/sms/sms.module';
import { AlertesController } from './alertes.controller';
import { AlertesService } from './alertes.service';

@Module({
  imports: [MailModule, SmsModule, JwtModule.register({})],
  controllers: [AlertesController],
  providers: [AlertesService],
  exports: [AlertesService],
})
export class AlertesModule {}
