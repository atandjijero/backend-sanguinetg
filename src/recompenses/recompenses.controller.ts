import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateRecompenseDto } from './dto/create-recompense.dto';
import { FindRecompensesQuery } from './dto/find-recompenses.query';
import { UpdateRecompenseStatutDto } from './dto/update-recompense-statut.dto';
import { RecompensesService } from './recompenses.service';

@ApiTags('recompenses')
@ApiBearerAuth()
@Controller('recompenses')
export class RecompensesController {
  constructor(private readonly recompensesService: RecompensesService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Attribuer une récompense à un donneur (badge, certificat, vivres, transport)',
    description: "Réservé aux rôles opérationnels CNTS : le SUPERADMIN peut consulter les récompenses mais ne les attribue pas.",
  })
  create(@Body() dto: CreateRecompenseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recompensesService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les récompenses',
    description: 'Un DONNEUR ne voit que les siennes ; le CNTS peut filtrer par donneur/type/statut.',
  })
  findAll(@Query() query: FindRecompensesQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.recompensesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une récompense" })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recompensesService.findOne(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.ADMIN)
  @Patch(':id/statut')
  @ApiOperation({ summary: 'Marquer une récompense comme utilisée / expirée' })
  updateStatut(@Param('id') id: string, @Body() dto: UpdateRecompenseStatutDto) {
    return this.recompensesService.updateStatut(id, dto);
  }
}
