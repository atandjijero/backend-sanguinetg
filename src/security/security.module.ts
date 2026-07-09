import { Module } from '@nestjs/common';
import { BruteForceDetectionService } from './brute-force-detection.service';
import { SecurityAlertsController } from './security-alerts.controller';
import { SecurityAlertsService } from './security-alerts.service';
import { ThreatDetectionService } from './threat-detection.service';

@Module({
  controllers: [SecurityAlertsController],
  providers: [SecurityAlertsService, BruteForceDetectionService, ThreatDetectionService],
  exports: [SecurityAlertsService, BruteForceDetectionService, ThreatDetectionService],
})
export class SecurityModule {}
