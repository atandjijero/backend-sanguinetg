import { Module } from '@nestjs/common';
import { GeocodingModule } from '../common/geocoding/geocoding.module';
import { CentresDonController } from './centres-don.controller';
import { CentresDonService } from './centres-don.service';

@Module({
  imports: [GeocodingModule],
  controllers: [CentresDonController],
  providers: [CentresDonService],
  exports: [CentresDonService],
})
export class CentresDonModule {}
