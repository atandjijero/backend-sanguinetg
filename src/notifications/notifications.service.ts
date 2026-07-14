import { Injectable, NotFoundException } from '@nestjs/common';
import { RepositoryService } from '../repository/repository.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: RepositoryService) {}

  findAllPourDonneur(donneurId: string) {
    return this.repository.notification.findMany({
      where: {
        donneurId,
        OR: [{ alerteId: null }, { alerte: { reponses: { none: { donneurId } } } }],
      },
      include: { alerte: { include: { quartier: true, centreDon: true } } },
      orderBy: { dateEnvoi: 'desc' },
      take: 50,
    });
  }

  async marquerLue(id: string, donneurId: string) {
    const notification = await this.repository.notification.findUnique({ where: { id } });
    if (!notification || notification.donneurId !== donneurId) {
      throw new NotFoundException('Notification introuvable');
    }
    return this.repository.notification.update({ where: { id }, data: { statut: 'LUE' } });
  }

  async marquerToutesLues(donneurId: string) {
    const { count } = await this.repository.notification.updateMany({
      where: { donneurId, statut: { not: 'LUE' } },
      data: { statut: 'LUE' },
    });
    return { misesAJour: count };
  }
}
