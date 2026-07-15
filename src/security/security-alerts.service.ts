import { Injectable, NotFoundException } from '@nestjs/common';
import { GraviteAlerteSecurite, Prisma, TypeAlerteSecurite } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { FindAlertesSecuriteQuery } from './dto/find-alertes-securite.query';

interface CreationAlerteSecurite {
  type: TypeAlerteSecurite;
  gravite: GraviteAlerteSecurite;
  message: string;
  ipSource?: string | null;
  uri?: string | null;
  userAgent?: string | null;
  payload?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

@Injectable()
export class SecurityAlertsService {
  constructor(private readonly repository: RepositoryService) {}

  async enregistrer(data: CreationAlerteSecurite) {
    return this.repository.alerteSecurite.create({ data });
  }

  async findAll(query: FindAlertesSecuriteQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 5;

    const where: Prisma.AlerteSecuriteWhereInput = {
      type: query.type,
      gravite: query.gravite,
      ...(query.recherche
        ? {
            OR: [
              { message: { contains: query.recherche, mode: 'insensitive' } },
              { ipSource: { contains: query.recherche, mode: 'insensitive' } },
              { uri: { contains: query.recherche, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.repository.alerteSecurite.findMany({
        where,
        orderBy: { dateCreation: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.repository.alerteSecurite.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async remove(id: string) {
    try {
      await this.repository.alerteSecurite.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Alerte de sécurité introuvable');
      }
      throw error;
    }
    return { success: true };
  }

  async removeMany(ids: string[]) {
    const { count } = await this.repository.alerteSecurite.deleteMany({ where: { id: { in: ids } } });
    return { supprimees: count };
  }

  async stats() {
    const [total, critiques, bruteForce, cspViolations, sqlInjections, xssAttempts] = await Promise.all([
      this.repository.alerteSecurite.count(),
      this.repository.alerteSecurite.count({ where: { gravite: 'CRITIQUE' } }),
      this.repository.alerteSecurite.count({ where: { type: 'BRUTE_FORCE' } }),
      this.repository.alerteSecurite.count({ where: { type: 'CSP_VIOLATION' } }),
      this.repository.alerteSecurite.count({ where: { type: 'SQL_INJECTION' } }),
      this.repository.alerteSecurite.count({ where: { type: 'XSS_ATTEMPT' } }),
    ]);

    return { total, critiques, bruteForce, cspViolations, sqlInjections, xssAttempts };
  }
}
