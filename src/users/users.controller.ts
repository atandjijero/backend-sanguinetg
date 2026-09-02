import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { FindUsersQuery } from './dto/find-users.query';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  getMe(@CurrentUser('id') id: string) {
    return this.usersService.findMe(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Mise à jour du profil de l\'utilisateur connecté' })
  updateMe(@CurrentUser('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(id, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Changement du mot de passe de l\'utilisateur connecté' })
  changePassword(@CurrentUser('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT_CNTS)
  @Get()
  @ApiOperation({
    summary: 'Liste des utilisateurs (filtrable par rôle / groupe sanguin / quartier)',
    description: 'Un ADMIN ne voit jamais les comptes SUPERADMIN dans la liste retournée.',
  })
  findAll(@Query() query: FindUsersQuery, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAll(query, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: "Détail d'un utilisateur (admin)" })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('staff')
  @ApiOperation({
    summary: 'Création d\'un compte SUPERADMIN / ADMIN / MEDECIN / AGENT_CNTS',
    description: 'Un ADMIN peut créer MEDECIN/AGENT_CNTS. Seul un SUPERADMIN peut créer ADMIN ou SUPERADMIN.',
  })
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.createStaff(dto, user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/statut')
  @ApiOperation({ summary: 'Activation / désactivation d\'un compte (admin uniquement)' })
  updateStatut(@Param('id') id: string, @Body() dto: UpdateStatutDto) {
    return this.usersService.updateStatut(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: "Suppression d'un compte donneur (superadmin uniquement)" })
  removeDonneur(@Param('id') id: string) {
    return this.usersService.removeDonneur(id);
  }
}
