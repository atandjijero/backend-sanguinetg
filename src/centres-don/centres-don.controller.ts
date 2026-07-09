import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CentresDonService } from './centres-don.service';
import { CreateCentreDonDto } from './dto/create-centre-don.dto';
import { UpdateCentreDonDto } from './dto/update-centre-don.dto';

@ApiTags('centres-don')
@Controller('centres-don')
export class CentresDonController {
  constructor(private readonly centresDonService: CentresDonService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste des centres de collecte du CNTS — public' })
  findAll() {
    return this.centresDonService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un centre de don" })
  findOne(@Param('id') id: string) {
    return this.centresDonService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer un centre de don (admin) — géolocalisation automatique si non fournie' })
  create(@Body() dto: CreateCentreDonDto) {
    return this.centresDonService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un centre de don (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCentreDonDto) {
    return this.centresDonService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un centre de don (admin)' })
  remove(@Param('id') id: string) {
    return this.centresDonService.remove(id);
  }
}
