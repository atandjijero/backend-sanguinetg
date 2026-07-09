import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FindAlertesSecuriteQuery } from './dto/find-alertes-securite.query';
import { SecurityAlertsService } from './security-alerts.service';

@ApiTags('security')
@Controller('security')
export class SecurityAlertsController {
  constructor(private readonly securityAlertsService: SecurityAlertsService) {}

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get('alertes')
  @ApiOperation({ summary: 'Liste paginée des alertes de sécurité (technique, réservé SUPERADMIN)' })
  findAll(@Query() query: FindAlertesSecuriteQuery) {
    return this.securityAlertsService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des alertes de sécurité (réservé SUPERADMIN)' })
  stats() {
    return this.securityAlertsService.stats();
  }

  @Public()
  @Post('csp-report')
  @ApiOperation({ summary: 'Endpoint recevant les rapports de violation CSP envoyés automatiquement par les navigateurs' })
  async recevoirRapportCsp(@Body() body: unknown, @Req() req: Request) {
    const rapport = this.extraireRapportCsp(body);
    if (rapport) {
      await this.securityAlertsService.enregistrer({
        type: 'CSP_VIOLATION',
        gravite: 'MOYEN',
        message: `Violation de CSP bloquée : la directive '${rapport.directive}' a été violée en tentant de charger : '${rapport.blockedUri}'.`,
        ipSource: req.ip ?? null,
        uri: rapport.documentUri,
      });
    }
    return { received: true };
  }

  private extraireRapportCsp(body: unknown): { directive: string; blockedUri: string; documentUri: string } | null {
    if (!body || typeof body !== 'object') return null;
    const data = body as Record<string, unknown>;

    // Ancien format standard "csp-report"
    const legacy = data['csp-report'] as Record<string, unknown> | undefined;
    if (legacy) {
      return {
        directive: String(legacy['violated-directive'] ?? legacy['effective-directive'] ?? 'inconnue'),
        blockedUri: String(legacy['blocked-uri'] ?? 'inconnue'),
        documentUri: String(legacy['document-uri'] ?? ''),
      };
    }

    // Nouveau format Reporting API : tableau de { type: 'csp-violation', body: {...} }
    if (Array.isArray(body)) {
      const item = body.find((r) => r?.type === 'csp-violation');
      if (item?.body) {
        return {
          directive: String(item.body.effectiveDirective ?? 'inconnue'),
          blockedUri: String(item.body.blockedURL ?? 'inconnue'),
          documentUri: String(item.body.documentURL ?? ''),
        };
      }
    }

    return null;
  }
}
