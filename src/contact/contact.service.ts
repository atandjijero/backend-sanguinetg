import { NotFoundException, Injectable } from '@nestjs/common';
import { RepositoryService } from '../repository/repository.service';
import { MailService } from '../common/mail/mail.service';
import { CreateMessageContactDto } from './dto/create-message-contact.dto';
import { FindMessagesContactQuery } from './dto/find-messages-contact.query';
import { ReplyMessageContactDto } from './dto/reply-message-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly mail: MailService,
  ) {}

  create(dto: CreateMessageContactDto) {
    return this.repository.messageContact.create({ data: dto });
  }

  findAll(query: FindMessagesContactQuery) {
    return this.repository.messageContact.findMany({
      where: { statut: query.statut },
      include: { repondPar: { select: { id: true, nom: true, prenom: true } } },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async repondre(id: string, dto: ReplyMessageContactDto, agentId: string) {
    const message = await this.getOrThrow(id);

    const misAJour = await this.repository.messageContact.update({
      where: { id },
      data: {
        reponse: dto.reponse,
        dateReponse: new Date(),
        statut: 'REPONDU',
        repondParId: agentId,
      },
      include: { repondPar: { select: { id: true, nom: true, prenom: true } } },
    });

    const emailEnvoye = await this.mail.envoyer({
      to: message.email,
      subject: `Re: ${message.sujet}`,
      text: `Bonjour ${message.nomComplet},\n\n${dto.reponse}\n\n— Le CNTS Lomé\n\n---\nVotre message initial :\n${message.message}`,
    });

    return { ...misAJour, emailEnvoye };
  }

  private async getOrThrow(id: string) {
    const message = await this.repository.messageContact.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message de contact introuvable');
    }
    return message;
  }
}
