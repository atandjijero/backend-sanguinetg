import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CarnetsService } from './carnets.service';
import { CreateCarnetDto } from './dto/create-carnet.dto';
import { FindCarnetsQuery } from './dto/find-carnets.query';
import { UpdateCarnetDto } from './dto/update-carnet.dto';

@ApiTags('carnets')
@ApiBearerAuth()
@Controller('carnets')
export class CarnetsController {
  constructor(private readonly carnetsService: CarnetsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.MEDECIN, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: "Enregistrer un don effectué dans le carnet digital d'un donneur" })
  create(@Body() dto: CreateCarnetDto) {
    return this.carnetsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Historique des dons',
    description: 'Un DONNEUR ne voit que son propre carnet ; le CNTS peut filtrer par donneur.',
  })
  findAll(@Query() query: FindCarnetsQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.carnetsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une entrée du carnet digital" })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.carnetsService.findOne(id, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.AGENT_CNTS, Role.MEDECIN, Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une entrée (message de remerciement, rappel, récompense liée)' })
  update(@Param('id') id: string, @Body() dto: UpdateCarnetDto) {
    return this.carnetsService.update(id, dto);
  }
}
