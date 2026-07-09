import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateRecompenseDto } from './dto/create-recompense.dto';
import { FindRecompensesQuery } from './dto/find-recompenses.query';
import { UpdateRecompenseStatutDto } from './dto/update-recompense-statut.dto';

@Injectable()
export class RecompensesService {
  constructor(private readonly repository: RepositoryService) {}

  async create(dto: CreateRecompenseDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN consulte les récompenses mais ne les attribue pas : action réservée aux rôles opérationnels CNTS.",
      );
    }

    try {
      return await this.repository.recompense.create({
        data: {
          donneurId: dto.donneurId,
          type: dto.type,
          description: dto.description,
          critereAttribution: dto.critereAttribution,
          attribueParId: user.id,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Le donneur sélectionné est invalide.');
      }
      throw error;
    }
  }

  findAll(query: FindRecompensesQuery, user: AuthenticatedUser) {
    const donneurId = user.role === Role.DONNEUR ? user.id : query.donneurId;

    return this.repository.recompense.findMany({
      where: { donneurId, type: query.type, statut: query.statut },
      include: { donneur: { select: { id: true, nom: true, prenom: true } } },
      orderBy: { dateAttribution: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const recompense = await this.repository.recompense.findUnique({ where: { id } });
    if (!recompense) {
      throw new NotFoundException('Récompense introuvable');
    }
    if (user.role === Role.DONNEUR && recompense.donneurId !== user.id) {
      throw new NotFoundException('Récompense introuvable');
    }
    return recompense;
  }

  async updateStatut(id: string, dto: UpdateRecompenseStatutDto) {
    await this.getOrThrow(id);
    return this.repository.recompense.update({ where: { id }, data: { statut: dto.statut } });
  }

  private async getOrThrow(id: string) {
    const recompense = await this.repository.recompense.findUnique({ where: { id } });
    if (!recompense) {
      throw new NotFoundException('Récompense introuvable');
    }
    return recompense;
  }
}
