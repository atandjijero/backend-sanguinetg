import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RepositoryModule } from './repository/repository.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AlertesModule } from './alertes/alertes.module';
import { QuartiersModule } from './quartiers/quartiers.module';
import { RecompensesModule } from './recompenses/recompenses.module';
import { CarnetsModule } from './carnets/carnets.module';
import { ConseilsModule } from './conseils/conseils.module';
import { CentresDonModule } from './centres-don/centres-don.module';
import { SecurityModule } from './security/security.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContactModule } from './contact/contact.module';
import { NotificationsModule } from './notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ThreatDetectionInterceptor } from './common/interceptors/threat-detection.interceptor';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      // 30 req/60s était trop strict pour un usage normal : une seule page de dashboard
      // (stats + listes + heartbeat + refresh) dépasse déjà ce seuil au chargement.
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    RepositoryModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    AlertesModule,
    QuartiersModule,
    RecompensesModule,
    CarnetsModule,
    ConseilsModule,
    CentresDonModule,
    AnalyticsModule,
    ContactModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ThreatDetectionInterceptor },
  ],
})
export class AppModule {}
