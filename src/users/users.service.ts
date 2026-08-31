import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RepositoryService } from '../repository/repository.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { FindUsersQuery } from './dto/find-users.query';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';

const SALT_ROUNDS = 12;

const PUBLIC_USER_SELECT = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  telephone: true,
  role: true,
  statut: true,
  groupeSanguin: true,
  quartierId: true,
  dateInscription: true,
  createdAt: true,
} satisfies Prisma.UtilisateurSelect;

@Injectable()
export class UsersService {
  constructor(private readonly repository: RepositoryService) {}

  async findMe(id: string) {
    return this.getOrThrow(id);
  }

  async updateMe(id: string, dto: UpdateProfileDto) {
    await this.getOrThrow(id);
    try {
      return await this.repository.utilisateur.update({
        where: { id },
        data: dto,
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const utilisateur = await this.repository.utilisateur.findUnique({
      where: { id },
    });
    if (!utilisateur || !utilisateur.motDePasse) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const motDePasseValide = await bcrypt.compare(
      dto.ancienMotDePasse,
      utilisateur.motDePasse,
    );
    if (!motDePasseValide) {
      throw new UnauthorizedException("L'ancien mot de passe est incorrect");
    }

    const nouveauHache = await bcrypt.hash(dto.nouveauMotDePasse, SALT_ROUNDS);
    await this.repository.utilisateur.update({
      where: { id },
      data: { motDePasse: nouveauHache },
    });

    return { message: 'Mot de passe mis à jour' };
  }

  async findAll(query: FindUsersQuery) {
    return this.repository.utilisateur.findMany({
      where: {
        role: query.role,
        groupeSanguin: query.groupeSanguin,
        quartierId: query.quartierId,
      },
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.getOrThrow(id);
  }

  async createStaff(dto: CreateStaffDto, creePar: { role: Role }) {
    const rolesReservesSuperadmin: Role[] = [Role.SUPERADMIN, Role.ADMIN];
    if (
      creePar.role !== Role.SUPERADMIN &&
      rolesReservesSuperadmin.includes(dto.role)
    ) {
      throw new ForbiddenException(
        'Seul un SUPERADMIN peut créer un compte ADMIN ou SUPERADMIN.',
      );
    }

    const motDePasseHache = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);
    try {
      return await this.repository.utilisateur.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email,
          telephone: dto.telephone,
          motDePasse: motDePasseHache,
          role: dto.role,
          emailVerifie: true,
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async updateStatut(id: string, dto: UpdateStatutDto) {
    await this.getOrThrow(id);
    return this.repository.utilisateur.update({
      where: { id },
      data: { statut: dto.statut },
      select: PUBLIC_USER_SELECT,
    });
  }

  async removeDonneur(id: string) {
    const utilisateur = await this.getOrThrow(id);
    if (utilisateur.role !== Role.DONNEUR) {
      throw new ForbiddenException(
        'Seuls les comptes donneurs peuvent être supprimés depuis cet endpoint.',
      );
    }
    await this.repository.utilisateur.delete({ where: { id } });
    return { message: 'Donneur supprimé' };
  }

  private async getOrThrow(id: string) {
    const utilisateur = await this.repository.utilisateur.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!utilisateur) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return utilisateur;
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          'Un compte existe déjà avec cet email ou ce numéro de téléphone.',
        );
      }
      if (error.code === 'P2003') {
        return new BadRequestException('Le quartier sélectionné est invalide.');
      }
    }
    return error as Error;
  }
}
