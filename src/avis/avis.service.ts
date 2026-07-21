import { Injectable } from '@nestjs/common';
import { RepositoryService } from '../repository/repository.service';
import { CreateAvisDto } from './dto/create-avis.dto';

@Injectable()
export class AvisService {
  constructor(private readonly repository: RepositoryService) {}

  // Un donneur ne peut laisser qu'un seul avis, qu'il peut mettre à jour ensuite. */
  donnerAvis(donneurId: string, dto: CreateAvisDto) {
    return this.repository.avisDonneur.upsert({
      where: { donneurId },
      create: { donneurId, note: dto.note, commentaire: dto.commentaire },
      update: { note: dto.note, commentaire: dto.commentaire },
    });
  }

  monAvis(donneurId: string) {
    return this.repository.avisDonneur.findUnique({ where: { donneurId } });
  }

  /** Indicateur H2 (mémoire, tableau 2) : taux de satisfaction des donneurs vis-à-vis de l'information reçue. */
  async statistiques() {
    const avis = await this.repository.avisDonneur.findMany({ select: { note: true } });
    const totalAvis = avis.length;
    const sommeNotes = avis.reduce((somme, a) => somme + a.note, 0);
    const avisSatisfaits = avis.filter((a) => a.note >= 4).length;

    return {
      totalAvis,
      moyenneNote: totalAvis > 0 ? Math.round((sommeNotes / totalAvis) * 10) / 10 : null,
      tauxSatisfaction: totalAvis > 0 ? Math.round((avisSatisfaits / totalAvis) * 100) : null,
    };
  }
}
