import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { CreateCarnetDto } from './dto/create-carnet.dto';
import { FindCarnetsQuery } from './dto/find-carnets.query';
import { UpdateCarnetDto } from './dto/update-carnet.dto';

const DELAI_MINIMAL_ENTRE_DONS_JOURS = 90;

@Injectable()
export class CarnetsService {
  constructor(private readonly repository: RepositoryService) {}

  async create(dto: CreateCarnetDto) {
    const dateDon = new Date(dto.dateDon);
    const rappelProchaineDate = dto.rappelProchaineDate
      ? new Date(dto.rappelProchaineDate)
      : new Date(dateDon.getTime() + DELAI_MINIMAL_ENTRE_DONS_JOURS * 24 * 60 * 60 * 1000);

    try {
      return await this.repository.carnetDigital.create({
        data: {
          donneurId: dto.donneurId,
          dateDon,
          centreDonId: dto.centreDonId,
          messageRemerciement: dto.messageRemerciement,
          rappelProchaineDate,
          reponseId: dto.reponseId,
        },
        include: { recompense: true, centreDon: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  findAll(query: FindCarnetsQuery, user: AuthenticatedUser) {
    const donneurId = user.role === Role.DONNEUR ? user.id : query.donneurId;

    return this.repository.carnetDigital.findMany({
      where: { donneurId },
      include: {
        recompense: true,
        centreDon: true,
        donneur: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { dateDon: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const carnet = await this.repository.carnetDigital.findUnique({
      where: { id },
      include: { recompense: true, centreDon: true },
    });
    if (!carnet || (user.role === Role.DONNEUR && carnet.donneurId !== user.id)) {
      throw new NotFoundException('Entrée de carnet introuvable');
    }
    return carnet;
  }

  async update(id: string, dto: UpdateCarnetDto) {
    await this.getOrThrow(id);
    try {
      return await this.repository.carnetDigital.update({
        where: { id },
        data: {
          centreDonId: dto.centreDonId,
          messageRemerciement: dto.messageRemerciement,
          rappelProchaineDate: dto.rappelProchaineDate ? new Date(dto.rappelProchaineDate) : undefined,
          recompenseId: dto.recompenseId,
        },
        include: { recompense: true, centreDon: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  private async getOrThrow(id: string) {
    const carnet = await this.repository.carnetDigital.findUnique({ where: { id } });
    if (!carnet) {
      throw new NotFoundException('Entrée de carnet introuvable');
    }
    return carnet;
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Cette réponse ou cette récompense est déjà liée à un autre carnet.');
      }
      if (error.code === 'P2003') {
        return new BadRequestException('Le donneur, le centre de don, la réponse ou la récompense référencé(e) est invalide.');
      }
    }
    return error as Error;
  }
}
