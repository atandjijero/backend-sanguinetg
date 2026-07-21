import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { MessagerieController } from './messagerie.controller';
import { MessagerieGateway } from './messagerie.gateway';
import { MessagerieService } from './messagerie.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MessagerieController],
  providers: [MessagerieService, MessagerieGateway, CloudinaryService],
  exports: [MessagerieService],
})
export class MessagerieModule {}
