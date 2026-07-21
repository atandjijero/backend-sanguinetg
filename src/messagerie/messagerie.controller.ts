import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { EnvoyerMessageVocalDto } from './dto/envoyer-message-vocal.dto';
import { ModifierMessageDto } from './dto/modifier-message.dto';
import { MessagerieGateway } from './messagerie.gateway';
import { MessagerieService } from './messagerie.service';

@ApiTags('messagerie')
@ApiBearerAuth()
@Controller('messagerie')
export class MessagerieController {
  constructor(
    private readonly messagerieService: MessagerieService,
    private readonly gateway: MessagerieGateway,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR)
  @Get('ma-conversation')
  @ApiOperation({ summary: 'Ma conversation avec l’équipe médicale du CNTS (créée si besoin)' })
  maConversation(@CurrentUser('id') donneurId: string) {
    return this.messagerieService.maConversationAvecMessages(donneurId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MEDECIN)
  @Get('conversations')
  @ApiOperation({ summary: 'Liste des conversations donneurs (lecture réservée au staff médical/admin)' })
  listerConversations() {
    return this.messagerieService.listerConversations();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.MEDECIN)
  @Get('conversations/:id')
  @ApiOperation({ summary: "Historique d'une conversation donneur" })
  messagesConversation(@Param('id') id: string) {
    return this.messagerieService.messagesConversation(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR, Role.MEDECIN)
  @Post('messages')
  @ApiOperation({
    summary: 'Envoyer un message (repli REST ; la messagerie utilise normalement le WebSocket /messagerie)',
    description: 'Réservé au donneur (sa propre conversation) et au médecin (avec conversationId) ; les autres rôles staff sont en lecture seule.',
  })
  async envoyerMessage(@Body() dto: EnvoyerMessageDto, @CurrentUser() user: AuthenticatedUser) {
    const resultat = await this.messagerieService.envoyerMessage(user, dto);
    this.gateway.diffuserMessage(resultat);
    return resultat.message;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR, Role.MEDECIN)
  @Post('messages/vocal')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('audio/')) {
          callback(new BadRequestException('Seuls les fichiers audio sont acceptés'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Envoyer un message vocal (upload audio vers Cloudinary)',
    description: 'Réservé au donneur (sa propre conversation) et au médecin (avec conversationId).',
  })
  async envoyerMessageVocal(
    @Body() dto: EnvoyerMessageVocalDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier audio reçu');
    }
    const resultat = await this.messagerieService.envoyerMessageVocal(
      user,
      file.buffer,
      dto.dureeSecondes,
      dto.conversationId,
    );
    this.gateway.diffuserMessage(resultat);
    return resultat.message;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR, Role.MEDECIN)
  @Patch('messages/:id')
  @ApiOperation({
    summary: 'Modifier un message (repli REST) — auteur du message uniquement, dans les 15 minutes suivant l’envoi',
  })
  async modifierMessage(
    @Param('id') id: string,
    @Body() dto: ModifierMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resultat = await this.messagerieService.modifierMessage(user, id, dto.contenu);
    this.gateway.diffuserMiseAJour(resultat);
    return resultat.message;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.DONNEUR, Role.MEDECIN)
  @Delete('messages/:id')
  @ApiOperation({ summary: 'Supprimer un message (repli REST) — auteur du message uniquement' })
  async supprimerMessage(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const resultat = await this.messagerieService.supprimerMessage(user, id);
    this.gateway.diffuserMiseAJour(resultat);
    return resultat.message;
  }
}
