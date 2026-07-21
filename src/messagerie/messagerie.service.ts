import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';

const AUTEUR_SELECT = {
  auteur: { select: { id: true, nom: true, prenom: true, role: true } },
} as const;

/** Fenêtre au-delà de laquelle un message ne peut plus être modifié (façon WhatsApp). */
const DELAI_MODIFICATION_MS = 15 * 60 * 1000;

@Injectable()
export class MessagerieService {
  constructor(private readonly repository: RepositoryService) {}

  /** Un donneur n'a qu'une seule conversation, créée paresseusement à son premier message. */
  async getOrCreateConversation(donneurId: string) {
    return this.repository.conversation.upsert({
      where: { donneurId },
      update: {},
      create: { donneurId },
    });
  }

  async maConversationAvecMessages(donneurId: string) {
    const conversation = await this.getOrCreateConversation(donneurId);
    const messages = await this.repository.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { dateEnvoi: 'asc' },
      include: AUTEUR_SELECT,
    });

    // Le donneur vient de consulter le fil : les messages envoyés par un médecin sont lus.
    await this.repository.chatMessage.updateMany({
      where: { conversationId: conversation.id, lu: false, auteur: { role: { not: Role.DONNEUR } } },
      data: { lu: true },
    });

    return { conversation, messages };
  }

  /** Vue « équipe médicale » : toutes les conversations, la plus récemment active en premier. */
  async listerConversations() {
    const conversations = await this.repository.conversation.findMany({
      include: {
        donneur: { select: { id: true, nom: true, prenom: true, groupeSanguin: true } },
        messages: { orderBy: { dateEnvoi: 'desc' }, take: 1, include: AUTEUR_SELECT },
        _count: { select: { messages: { where: { lu: false, auteur: { role: Role.DONNEUR } } } } },
      },
      orderBy: { dernierMessageAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      donneur: c.donneur,
      dernierMessageAt: c.dernierMessageAt,
      dernierMessage: c.messages[0] ?? null,
      messagesNonLus: c._count.messages,
    }));
  }

  async messagesConversation(conversationId: string) {
    const conversation = await this.repository.conversation.findUnique({
      where: { id: conversationId },
      include: { donneur: { select: { id: true, nom: true, prenom: true, groupeSanguin: true } } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation introuvable');
    }

    const messages = await this.repository.chatMessage.findMany({
      where: { conversationId },
      orderBy: { dateEnvoi: 'asc' },
      include: AUTEUR_SELECT,
    });

    // L'équipe médicale vient de consulter le fil : les messages envoyés par le donneur sont lus.
    await this.repository.chatMessage.updateMany({
      where: { conversationId, lu: false, auteur: { role: Role.DONNEUR } },
      data: { lu: true },
    });

    return { conversation, messages };
  }

  /**
   * Un donneur écrit dans sa propre conversation (créée si besoin) ; un membre du staff doit
   * préciser quelle conversation (quel donneur) il vise, et seul un médecin peut y répondre —
   * le reste du staff garde un accès en lecture seule pour la supervision.
   */
  async envoyerMessage(auteur: { id: string; role: Role }, dto: EnvoyerMessageDto) {
    const contenu = dto.contenu.trim();
    if (!contenu) {
      throw new BadRequestException('Le message ne peut pas être vide.');
    }

    let conversation;
    if (auteur.role === Role.DONNEUR) {
      conversation = await this.getOrCreateConversation(auteur.id);
    } else {
      if (auteur.role !== Role.MEDECIN) {
        throw new ForbiddenException('Seul un médecin peut répondre dans la messagerie.');
      }
      if (!dto.conversationId) {
        throw new BadRequestException('conversationId requis pour répondre en tant que médecin.');
      }
      conversation = await this.repository.conversation.findUnique({ where: { id: dto.conversationId } });
      if (!conversation) {
        throw new NotFoundException('Conversation introuvable');
      }
    }

    const message = await this.repository.chatMessage.create({
      data: { conversationId: conversation.id, auteurId: auteur.id, contenu },
      include: AUTEUR_SELECT,
    });

    await this.repository.conversation.update({
      where: { id: conversation.id },
      data: { dernierMessageAt: message.dateEnvoi },
    });

    return { message, donneurId: conversation.donneurId, conversationId: conversation.id };
  }

  /** Seul l'auteur peut modifier son message, et seulement dans les 15 minutes suivant l'envoi. */
  async modifierMessage(auteur: { id: string; role: Role }, messageId: string, contenuBrut: string) {
    const message = await this.getMessageOuThrow(messageId);

    if (message.auteurId !== auteur.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages.');
    }
    if (message.supprime) {
      throw new BadRequestException('Ce message a été supprimé et ne peut plus être modifié.');
    }
    if (Date.now() - message.dateEnvoi.getTime() > DELAI_MODIFICATION_MS) {
      throw new BadRequestException('Le délai de modification (15 minutes) est dépassé.');
    }

    const contenu = contenuBrut.trim();
    if (!contenu) {
      throw new BadRequestException('Le message ne peut pas être vide.');
    }

    const messageModifie = await this.repository.chatMessage.update({
      where: { id: messageId },
      data: { contenu, edite: true, dateModification: new Date() },
      include: AUTEUR_SELECT,
    });

    return { message: messageModifie, donneurId: message.conversation.donneurId };
  }

  /** Suppression « façon WhatsApp » : le message reste dans le fil sous forme d'un tombstone. */
  async supprimerMessage(auteur: { id: string; role: Role }, messageId: string) {
    const message = await this.getMessageOuThrow(messageId);

    if (message.auteurId !== auteur.id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages.');
    }
    if (message.supprime) {
      return { message, donneurId: message.conversation.donneurId };
    }

    const messageSupprime = await this.repository.chatMessage.update({
      where: { id: messageId },
      data: { contenu: '', supprime: true, dateModification: new Date() },
      include: AUTEUR_SELECT,
    });

    return { message: messageSupprime, donneurId: message.conversation.donneurId };
  }

  private async getMessageOuThrow(messageId: string) {
    const message = await this.repository.chatMessage.findUnique({
      where: { id: messageId },
      include: { conversation: { select: { donneurId: true } } },
    });
    if (!message) {
      throw new NotFoundException('Message introuvable');
    }
    return message;
  }
}
