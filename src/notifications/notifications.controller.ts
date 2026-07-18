import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.DONNEUR)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Notifications du donneur connecté (push, avec statut email envoyé)' })
  findAll(@CurrentUser('id') donneurId: string) {
    return this.notificationsService.findAllPourDonneur(donneurId);
  }

  @Patch(':id/lue')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  marquerLue(@Param('id') id: string, @CurrentUser('id') donneurId: string) {
    return this.notificationsService.marquerLue(id, donneurId);
  }

  @Patch('lues')
  @ApiOperation({ summary: 'Marquer toutes les notifications du donneur comme lues' })
  marquerToutesLues(@CurrentUser('id') donneurId: string) {
    return this.notificationsService.marquerToutesLues(donneurId);
  }
}
