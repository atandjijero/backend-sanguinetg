import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import { RepositoryService } from '../repository/repository.service';
import type { JwtPayload } from '../auth/types/authenticated-user.interface';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { ModifierMessageDto } from './dto/modifier-message.dto';
import { MessagerieService } from './messagerie.service';

const ROLES_STAFF_LECTURE: Role[] = [Role.SUPERADMIN, Role.ADMIN, Role.MEDECIN];

interface SocketUser {
  id: string;
  role: Role;
}

@WebSocketGateway({ cors: { origin: true, credentials: true }, namespace: '/messagerie' })
export class MessagerieGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(MessagerieGateway.name);

  constructor(
    private readonly messagerieService: MessagerieService,
    private readonly repository: RepositoryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) throw new Error('token manquant');

        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        });

        const user = await this.repository.utilisateur.findUnique({
          where: { id: payload.sub },
          select: { id: true, role: true, statut: true },
        });
        if (!user || user.statut !== 'ACTIF') throw new Error('compte introuvable ou désactivé');
        if (user.role !== Role.DONNEUR && !ROLES_STAFF_LECTURE.includes(user.role)) {
          throw new Error('rôle non autorisé sur la messagerie');
        }

        socket.data.user = { id: user.id, role: user.role } satisfies SocketUser;
        next();
      } catch (error) {
        this.logger.warn(`Connexion WebSocket refusée : ${(error as Error).message}`);
        next(error as Error);
      }
    });
  }

  handleConnection(client: Socket) {
    const user = client.data.user as SocketUser;
    if (user.role === Role.DONNEUR) {
      client.join(`donneur:${user.id}`);
    } else {
      client.join('staff');
    }
  }

  @SubscribeMessage('envoyer_message')
  async onEnvoyerMessage(@ConnectedSocket() client: Socket, @MessageBody() dto: EnvoyerMessageDto) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) {
      client.disconnect(true);
      return;
    }

    try {
      const resultat = await this.messagerieService.envoyerMessage(user, dto);
      this.diffuserMessage(resultat);
    } catch (error) {
      client.emit('erreur_message', { message: (error as Error).message });
    }
  }

  diffuserMessage(resultat: { message: unknown; donneurId: string }) {
    this.server.to(`donneur:${resultat.donneurId}`).to('staff').emit('nouveau_message', resultat.message);
  }

  @SubscribeMessage('modifier_message')
  async onModifierMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string } & ModifierMessageDto,
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return { success: false, error: 'Non authentifié' };

    try {
      const resultat = await this.messagerieService.modifierMessage(user, data.messageId, data.contenu);
      this.diffuserMiseAJour(resultat);
      return { success: true, message: resultat.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('supprimer_message')
  async onSupprimerMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { messageId: string }) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return { success: false, error: 'Non authentifié' };

    try {
      const resultat = await this.messagerieService.supprimerMessage(user, data.messageId);
      this.diffuserMiseAJour(resultat);
      return { success: true, message: resultat.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  diffuserMiseAJour(resultat: { message: unknown; donneurId: string }) {
    this.server.to(`donneur:${resultat.donneurId}`).to('staff').emit('message_mis_a_jour', resultat.message);
  }

  @SubscribeMessage('typing_start')
  async onTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; type?: 'texte' | 'vocal' },
  ) {
    await this.relayerFrappe(client, data?.conversationId, true, data?.type ?? 'texte');
  }

  @SubscribeMessage('typing_stop')
  async onTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; type?: 'texte' | 'vocal' },
  ) {
    await this.relayerFrappe(client, data?.conversationId, false, data?.type ?? 'texte');
  }

  private async relayerFrappe(
    client: Socket,
    conversationId: string | undefined,
    enTrainDecrire: boolean,
    type: 'texte' | 'vocal',
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return;

    const cible = await this.messagerieService.trouverConversationPourFrappe(user, conversationId);
    if (!cible) return;

    const salle = user.role === Role.DONNEUR ? 'staff' : `donneur:${cible.donneurId}`;
    client.to(salle).emit('frappe', {
      conversationId: cible.conversationId,
      donneurId: cible.donneurId,
      auteurRole: user.role,
      enTrainDecrire,
      type,
    });
  }
}
