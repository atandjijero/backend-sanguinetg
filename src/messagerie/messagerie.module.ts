import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagerieController } from './messagerie.controller';
import { MessagerieGateway } from './messagerie.gateway';
import { MessagerieService } from './messagerie.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MessagerieController],
  providers: [MessagerieService, MessagerieGateway],
  exports: [MessagerieService],
})
export class MessagerieModule {}
