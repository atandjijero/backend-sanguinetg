import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';

@ApiTags('push')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(Role.DONNEUR)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: "Clé publique VAPID nécessaire pour s'abonner aux notifications push" })
  getVapidPublicKey() {
    return { publicKey: this.pushService.getVapidPublicKey(), configure: this.pushService.estConfigure() };
  }

  @Post('subscribe')
  @ApiOperation({ summary: "Enregistre l'abonnement push de l'appareil courant pour le donneur connecté" })
  subscribe(@Body() dto: SubscribePushDto, @CurrentUser('id') donneurId: string) {
    return this.pushService.abonner(donneurId, dto);
  }

  @Delete('subscribe')
  @ApiOperation({ summary: "Retire l'abonnement push de l'appareil courant" })
  unsubscribe(@Query('endpoint') endpoint: string, @CurrentUser('id') donneurId: string) {
    return this.pushService.desabonner(donneurId, endpoint);
  }
}
