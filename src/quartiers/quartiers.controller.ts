import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateQuartierDto } from './dto/create-quartier.dto';
import { UpdateQuartierDto } from './dto/update-quartier.dto';
import { QuartiersService } from './quartiers.service';

@ApiTags('quartiers')
@Controller('quartiers')
export class QuartiersController {
  constructor(private readonly quartiersService: QuartiersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste des quartiers (pilote Lomé) — public, utilisé par les formulaires' })
  findAll() {
    return this.quartiersService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un quartier" })
  findOne(@Param('id') id: string) {
    return this.quartiersService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Créer un quartier (admin uniquement)' })
  create(@Body() dto: CreateQuartierDto) {
    return this.quartiersService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un quartier (admin uniquement)' })
  update(@Param('id') id: string, @Body() dto: UpdateQuartierDto) {
    return this.quartiersService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un quartier (admin uniquement)' })
  remove(@Param('id') id: string) {
    return this.quartiersService.remove(id);
  }
}
