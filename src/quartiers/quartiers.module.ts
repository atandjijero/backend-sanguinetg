import { Module } from '@nestjs/common';
import { GeocodingModule } from '../common/geocoding/geocoding.module';
import { QuartiersController } from './quartiers.controller';
import { QuartiersService } from './quartiers.service';

@Module({
  imports: [GeocodingModule],
  controllers: [QuartiersController],
  providers: [QuartiersService],
  exports: [QuartiersService],
})
export class QuartiersModule {}
