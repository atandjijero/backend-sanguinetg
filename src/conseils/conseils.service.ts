import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateConseilDto } from './dto/create-conseil.dto';
import { FindConseilsQuery } from './dto/find-conseils.query';
import { UpdateConseilDto } from './dto/update-conseil.dto';

@Injectable()
export class ConseilsService {
  constructor(private readonly repository: RepositoryService) {}

  create(dto: CreateConseilDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN consulte l'espace conseil santé mais ne publie pas de conseil : action réservée au rôle MEDECIN.",
      );
    }

    return this.repository.conseilSante.create({
      data: {
        titre: dto.titre,
        contenu: dto.contenu,
        categorie: dto.categorie,
        valideParId: user.id,
      },
      include: { validePar: { select: { id: true, nom: true, prenom: true } } },
    });
  }

  findAll(query: FindConseilsQuery) {
    return this.repository.conseilSante.findMany({
      where: { categorie: query.categorie },
      include: { validePar: { select: { id: true, nom: true, prenom: true } } },
      orderBy: { datePublication: 'desc' },
    });
  }

  async findOne(id: string) {
    const conseil = await this.repository.conseilSante.findUnique({
      where: { id },
      include: { validePar: { select: { id: true, nom: true, prenom: true } } },
    });
    if (!conseil) {
      throw new NotFoundException('Conseil santé introuvable');
    }
    return conseil;
  }

  async update(id: string, dto: UpdateConseilDto) {
    await this.getOrThrow(id);
    return this.repository.conseilSante.update({
      where: { id },
      data: dto,
      include: { validePar: { select: { id: true, nom: true, prenom: true } } },
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.repository.conseilSante.delete({ where: { id } });
    return { message: 'Conseil santé supprimé' };
  }

  private async getOrThrow(id: string) {
    const conseil = await this.repository.conseilSante.findUnique({ where: { id } });
    if (!conseil) {
      throw new NotFoundException('Conseil santé introuvable');
    }
    return conseil;
  }
}
