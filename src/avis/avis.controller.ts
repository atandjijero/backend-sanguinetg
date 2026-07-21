import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AvisService } from './avis.service';
import { CreateAvisDto } from './dto/create-avis.dto';

@ApiTags('avis')
@ApiBearerAuth()
@Controller('avis')
export class AvisController {
  constructor(private readonly avisService: AvisService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR)
  @Post()
  @ApiOperation({ summary: "Donner (ou mettre à jour) son avis de satisfaction sur l'information et le suivi reçus" })
  donnerAvis(@Body() dto: CreateAvisDto, @CurrentUser('id') donneurId: string) {
    return this.avisService.donnerAvis(donneurId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR)
  @Get('moi')
  @ApiOperation({ summary: 'Mon avis déjà déposé (le cas échéant)' })
  monAvis(@CurrentUser('id') donneurId: string) {
    return this.avisService.monAvis(donneurId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.AGENT_CNTS, Role.MEDECIN)
  @Get('statistiques')
  @ApiOperation({ summary: 'Indicateur de satisfaction (H2) : note moyenne et taux de satisfaction des donneurs' })
  statistiques() {
    return this.avisService.statistiques();
  }
}
