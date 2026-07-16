import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { AlertesService } from './alertes.service';
import { CreateAlerteDto } from './dto/create-alerte.dto';
import { CreateReponseDto } from './dto/create-reponse.dto';
import { FindAlertesQuery } from './dto/find-alertes.query';
import { ReponseEmailDto } from './dto/reponse-email.dto';
import { UpdateAlerteStatutDto } from './dto/update-alerte-statut.dto';

@ApiTags('alertes')
@ApiBearerAuth()
@Controller('alertes')
export class AlertesController {
  constructor(private readonly alertesService: AlertesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Créer une ou plusieurs alertes (groupes × quartiers) et notifier les donneurs compatibles',
    description:
      'Une alerte est créée par combinaison groupe sanguin × quartier. Retourne le tableau des alertes créées. ' +
      "Réservé aux rôles opérationnels CNTS : le SUPERADMIN (technicien de la plateforme) n'est pas habilité à lancer d'alerte.",
  })
  create(@Body() dto: CreateAlerteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.alertesService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les alertes',
    description:
      "Pour un DONNEUR : uniquement les alertes ouvertes compatibles avec son groupe sanguin et son quartier. Pour le CNTS : toutes les alertes, filtrables.",
  })
  findAll(@Query() query: FindAlertesQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.alertesService.findAll(query, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.AGENT_CNTS, Role.MEDECIN)
  @Get('statistiques/mobilisation')
  @ApiOperation({
    summary: 'Indicateurs de mobilisation (H1) : délai moyen de réponse et taux de couverture en moins d\'une heure',
  })
  statistiquesMobilisation() {
    return this.alertesService.statistiquesMobilisation();
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une alerte" })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.alertesService.findOne(id, user);
  }

  @Public()
  @Get('reponse-email/apercu')
  @ApiOperation({ summary: "Aperçu (lecture seule) de l'alerte visée par un lien de réponse par email" })
  apercuReponseEmail(@Query('token') token: string) {
    return this.alertesService.apercuReponseEmail(token);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.ADMIN)
  @Patch(':id/statut')
  @ApiOperation({ summary: 'Ouvrir / fermer une alerte (rôles opérationnels CNTS uniquement)' })
  updateStatut(@Param('id') id: string, @Body() dto: UpdateAlerteStatutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.alertesService.updateStatut(id, dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.ADMIN)
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une alerte (rôles opérationnels CNTS uniquement)',
    description: 'Supprime aussi les réponses des donneurs liées à cette alerte ; les notifications déjà envoyées sont conservées.',
  })
  remove(@Param('id') id: string) {
    return this.alertesService.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR)
  @Post(':id/reponses')
  @ApiOperation({ summary: 'Répondre « Je viens » / « Indisponible » à une alerte (un clic)' })
  repondre(
    @Param('id') alerteId: string,
    @Body() dto: CreateReponseDto,
    @CurrentUser('id') donneurId: string,
  ) {
    return this.alertesService.repondre(alerteId, donneurId, dto);
  }

  @Public()
  @Post('reponse-email')
  @ApiOperation({ summary: "Répondre à une alerte depuis le lien cliqué dans l'email (sans connexion)" })
  repondreParEmail(@Body() dto: ReponseEmailDto) {
    return this.alertesService.repondreParEmail(dto.token, dto.statut);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.ADMIN)
  @Get(':id/reponses')
  @ApiOperation({ summary: 'Liste des réponses des donneurs à une alerte (avec coordonnées de contact)' })
  findReponses(@Param('id') id: string) {
    return this.alertesService.findReponses(id);
  }
}
