import { Module } from '@nestjs/common';
import { HistoriqueController } from './historique.controller';
import { HistoriqueInterceptor } from './historique.interceptor';
import { HistoriqueService } from './historique.service';

@Module({
  controllers: [HistoriqueController],
  providers: [HistoriqueService, HistoriqueInterceptor],
  exports: [HistoriqueService, HistoriqueInterceptor],
})
export class HistoriqueModule {}
