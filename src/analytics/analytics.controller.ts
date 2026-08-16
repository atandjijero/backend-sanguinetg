import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { HeartbeatDto } from './dto/heartbeat.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('heartbeat')
  @ApiOperation({
    summary: 'Signal de présence envoyé périodiquement par le frontend (public : visiteurs connectés ou non)',
  })
  heartbeat(@Body() dto: HeartbeatDto, @Headers('authorization') authHeader?: string) {
    return this.analyticsService.heartbeat(dto, authHeader);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de fréquentation en temps réel (réservé SUPERADMIN)' })
  stats() {
    return this.analyticsService.stats();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get('connectes')
  @ApiOperation({ summary: 'Liste des utilisateurs actuellement connectés (réservé SUPERADMIN)' })
  connectes() {
    return this.analyticsService.connectes();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get('sessions-recentes')
  @ApiOperation({ summary: 'Sessions de visite des 14 derniers jours, pour la tendance de fréquentation (réservé SUPERADMIN)' })
  sessionsRecentes() {
    return this.analyticsService.sessionsRecentes();
  }
}
