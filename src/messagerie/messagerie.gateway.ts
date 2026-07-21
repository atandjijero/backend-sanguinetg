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

/**
 * Salle unique « staff » pour l'équipe médicale/admin (vue de supervision en direct sur
 * toutes les conversations) ; chaque donneur a sa propre salle privée `donneur:{id}` — plus
 * simple qu'une salle par conversation, qui aurait exigé de faire rejoindre dynamiquement
 * tout médecin déjà connecté dès qu'un nouveau donneur écrit pour la première fois.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true }, namespace: '/messagerie' })
export class MessagerieGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(MessagerieGateway.name);

  constructor(
    private readonly messagerieService: MessagerieService,
    private readonly repository: RepositoryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authentifie via un middleware de namespace plutôt que dans `handleConnection` : le
   * middleware s'exécute pendant la poignée de main, AVANT que le client ne reçoive son
   * événement `connect` — contrairement à `handleConnection`, qui tourne après coup et peut
   * donc encore être « en cours » (lookup DB async) au moment où le client, déjà connecté de
   * son point de vue, envoie son premier message. Sans ça, `client.data.user` peut être encore
   * vide à ce moment-là (race condition constatée en test).
   */
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

  /** `socket.data.user` est garanti déjà posé ici : le middleware ci-dessus a tourné avant. */
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

  /** Utilisé par le contrôleur REST (repli) et par le gestionnaire WebSocket ci-dessus. */
  diffuserMessage(resultat: { message: unknown; donneurId: string }) {
    this.server.to(`donneur:${resultat.donneurId}`).to('staff').emit('nouveau_message', resultat.message);
  }

  /**
   * Modification/suppression répondent via l'accusé de réception socket.io (la valeur
   * retournée par le handler) plutôt que par un événement séparé : l'action est déclenchée
   * par un clic précis de l'utilisateur (bouton modifier/supprimer), qui attend un retour
   * immédiat (succès/erreur) pour fermer son menu ou afficher un message d'erreur.
   */
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

  /** Utilisé par le contrôleur REST (repli) et par les gestionnaires WebSocket ci-dessus. */
  diffuserMiseAJour(resultat: { message: unknown; donneurId: string }) {
    this.server.to(`donneur:${resultat.donneurId}`).to('staff').emit('message_mis_a_jour', resultat.message);
  }
}
