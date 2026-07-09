import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { ConseilsService } from './conseils.service';
import { CreateConseilDto } from './dto/create-conseil.dto';
import { FindConseilsQuery } from './dto/find-conseils.query';
import { UpdateConseilDto } from './dto/update-conseil.dto';

@ApiTags('conseils-sante')
@Controller('conseils')
export class ConseilsController {
  constructor(private readonly conseilsService: ConseilsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Espace conseil santé (avant don / après don / éligibilité) — public' })
  findAll(@Query() query: FindConseilsQuery) {
    return this.conseilsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un conseil santé" })
  findOne(@Param('id') id: string) {
    return this.conseilsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.MEDECIN)
  @Post()
  @ApiOperation({
    summary: 'Publier un conseil santé validé par un médecin du CNTS',
    description: "Réservé au rôle MEDECIN : le SUPERADMIN peut consulter l'espace conseil santé mais ne le publie pas.",
  })
  create(@Body() dto: CreateConseilDto, @CurrentUser() user: AuthenticatedUser) {
    return this.conseilsService.create(dto, user);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.MEDECIN, Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un conseil santé' })
  update(@Param('id') id: string, @Body() dto: UpdateConseilDto) {
    return this.conseilsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.MEDECIN, Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un conseil santé' })
  remove(@Param('id') id: string) {
    return this.conseilsService.remove(id);
  }
}
