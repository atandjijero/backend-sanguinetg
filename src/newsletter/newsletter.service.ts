import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { CreateAbonneDto } from './dto/create-abonne.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly repository: RepositoryService) {}

  async abonner(dto: CreateAbonneDto) {
    try {
      return await this.repository.abonneNewsletter.create({ data: dto });
    } catch (error) {
      // Email déjà abonné : on traite le renvoi du formulaire comme un succès idempotent
      // plutôt que d'exposer une erreur au visiteur.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.repository.abonneNewsletter.findUniqueOrThrow({ where: { email: dto.email } });
      }
      throw error;
    }
  }

  findAll() {
    return this.repository.abonneNewsletter.findMany({ orderBy: { dateAbonnement: 'desc' } });
  }

  async stats() {
    const total = await this.repository.abonneNewsletter.count();
    return { total };
  }
}
