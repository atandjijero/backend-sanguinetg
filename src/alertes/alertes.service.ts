import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, StatutReponse } from '@prisma/client';
import {
  formatGroupeSanguin,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isDonneurCompatible,
} from '../common/constants/blood-compatibility';
import { RepositoryService } from '../repository/repository.service';
import { distanceKm } from '../common/utils/geo.util';
import { MailService } from '../common/mail/mail.service';
import { SmsService } from '../common/sms/sms.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { genererEmailAlerte } from './alerte-email.template';
import { CreateAlerteDto } from './dto/create-alerte.dto';
import { CreateReponseDto } from './dto/create-reponse.dto';
import { FindAlertesQuery } from './dto/find-alertes.query';
import { UpdateAlerteStatutDto } from './dto/update-alerte-statut.dto';

interface TokenReponseEmail {
  type: 'reponse_alerte';
  alerteId: string;
  donneurId: string;
}

interface DonneurCible {
  id: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
}

const ALERTE_INCLUDE = {
  quartier: true,
  centreDon: true,
  creePar: { select: { id: true, nom: true, prenom: true } },
} satisfies Prisma.AlerteInclude;

@Injectable()
export class AlertesService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}


  // Crée une alerte par combinaison (groupe sanguin × quartier × centre) — chaque
   //combinaison cible et notifie un ensemble de donneurs distinct, donc reste une Alerte
   //séparée (fermeture/suivi indépendants) même quand elles sont lancées en un seul geste.
   //Quand plusieurs centres sont choisis pour un même quartier, les donneurs éligibles sont
   //répartis vers le centre sélectionné le plus proche (jamais notifiés deux fois).

  async create(dto: CreateAlerteDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN administre la plateforme mais ne lance pas d'alerte : cette action est réservée aux rôles opérationnels CNTS (agent, admin).",
      );
    }

    const centresSelectionnes = await this.repository.centreDon.findMany({
      where: { id: { in: dto.centreDonIds } },
      select: { id: true, latitude: true, longitude: true },
    });

    const resultats: Awaited<ReturnType<typeof this.creerAlertePourCentre>>[] = [];
    for (const groupeSanguinRequis of dto.groupesSanguinsRequis) {
      for (const quartierId of dto.quartierIds) {
        const nombreDonneursMax = dto.nombreDonneursMaxParQuartier?.[quartierId];
        const repartition = await this.repartirDonneursDuQuartier(
          groupeSanguinRequis,
          quartierId,
          dto.centreDonIds,
          centresSelectionnes,
          nombreDonneursMax,
        );
        for (const centreDonId of dto.centreDonIds) {
          resultats.push(
            await this.creerAlertePourCentre(
              groupeSanguinRequis,
              quartierId,
              centreDonId,
              dto.rayonKm,
              repartition.get(centreDonId) ?? [],
              user.id,
            ),
          );
        }
      }
    }
    return resultats;
  }

  private async creerAlertePourCentre(
    groupeSanguinRequis: Prisma.AlerteGetPayload<object>['groupeSanguinRequis'],
    quartierId: string,
    centreDonId: string,
    rayonKm: number | undefined,
    donneursCibles: DonneurCible[],
    agentId: string,
  ) {
    let alerte;
    try {
      alerte = await this.repository.alerte.create({
        data: { groupeSanguinRequis, quartierId, centreDonId, rayonKm, creeParId: agentId },
        include: ALERTE_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(
          `Le quartier ou le centre de collecte sélectionné est invalide.`,
        );
      }
      throw error;
    }

    const donneursNotifies = await this.notifierDonneurs(alerte, donneursCibles);
    return { ...alerte, donneursNotifies };
  }

  async findAll(query: FindAlertesQuery, user: AuthenticatedUser) {
    if (user.role === Role.DONNEUR) {
      return this.findAllPourDonneur(user.id);
    }

    return this.repository.alerte.findMany({
      where: {
        statut: query.statut,
        groupeSanguinRequis: query.groupeSanguinRequis,
        quartierId: query.quartierId,
      },
      include: {
        ...ALERTE_INCLUDE,
        _count: { select: { reponses: true, notifications: true } },
      },
      orderBy: { dateCreation: 'desc' },
      take: 100,
    });
  }

  private async findAllPourDonneur(donneurId: string) {
    const donneur = await this.repository.utilisateur.findUnique({
      where: { id: donneurId },
      select: { groupeSanguin: true, quartierId: true },
    });

    if (!donneur?.groupeSanguin || !donneur.quartierId) {
      return [];
    }

    const alertes = await this.repository.alerte.findMany({
      where: {
        statut: 'OUVERTE',
        quartierId: donneur.quartierId,
        groupeSanguinRequis: { in: getCompatibleRecipientGroups(donneur.groupeSanguin) },
      },
      include: ALERTE_INCLUDE,
      orderBy: { dateCreation: 'desc' },
    });

    const reponses = await this.repository.reponse.findMany({
      where: { donneurId, alerteId: { in: alertes.map((alerte) => alerte.id) } },
      select: { alerteId: true, statut: true },
    });
    const reponseParAlerte = new Map(reponses.map((reponse) => [reponse.alerteId, reponse.statut]));

    return alertes.map((alerte) => ({ ...alerte, maReponse: reponseParAlerte.get(alerte.id) ?? null }));
  }

  /**
   * Indicateurs H1 (mémoire, tableau 1) : délai moyen entre le lancement d'une alerte et les
   * réponses « Je viens », et taux d'alertes ayant obtenu une première réponse en moins d'une heure.
   */
  async statistiquesMobilisation() {
    const alertes = await this.repository.alerte.findMany({
      select: {
        dateCreation: true,
        reponses: {
          where: { statut: 'JE_VIENS' },
          select: { dateReponse: true },
          orderBy: { dateReponse: 'asc' },
        },
      },
    });

    const UNE_HEURE_MS = 60 * 60 * 1000;
    let sommeDelaisMs = 0;
    let nombreReponses = 0;
    let alertesCouvertesUneHeure = 0;

    for (const alerte of alertes) {
      const premiereReponse = alerte.reponses[0];
      if (premiereReponse) {
        const delaiPremiereReponseMs = premiereReponse.dateReponse.getTime() - alerte.dateCreation.getTime();
        if (delaiPremiereReponseMs <= UNE_HEURE_MS) {
          alertesCouvertesUneHeure += 1;
        }
      }
      for (const reponse of alerte.reponses) {
        sommeDelaisMs += reponse.dateReponse.getTime() - alerte.dateCreation.getTime();
        nombreReponses += 1;
      }
    }

    const nombreAlertes = alertes.length;
    return {
      nombreAlertes,
      nombreReponses,
      delaiMoyenMinutes: nombreReponses > 0 ? Math.round(sommeDelaisMs / nombreReponses / 60000) : null,
      tauxCouvertureUneHeure: nombreAlertes > 0 ? Math.round((alertesCouvertesUneHeure / nombreAlertes) * 100) : null,
      donneursMobilisesParAlerte: nombreAlertes > 0 ? Math.round((nombreReponses / nombreAlertes) * 10) / 10 : null,
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const alerte = await this.repository.alerte.findUnique({ where: { id }, include: ALERTE_INCLUDE });
    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }

    if (user.role === Role.DONNEUR) {
      const maReponse = await this.repository.reponse.findUnique({
        where: { alerteId_donneurId: { alerteId: id, donneurId: user.id } },
      });
      return { ...alerte, maReponse: maReponse?.statut ?? null };
    }

    const [jeViens, indisponible] = await Promise.all([
      this.repository.reponse.count({ where: { alerteId: id, statut: 'JE_VIENS' } }),
      this.repository.reponse.count({ where: { alerteId: id, statut: 'INDISPONIBLE' } }),
    ]);
    return { ...alerte, resume: { jeViens, indisponible } };
  }

  async updateStatut(id: string, dto: UpdateAlerteStatutDto, user: AuthenticatedUser) {
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException(
        "Le SUPERADMIN administre la plateforme mais ne gère pas le cycle de vie des alertes (ouverture/fermeture) : action réservée aux rôles opérationnels CNTS.",
      );
    }

    await this.getOrThrow(id);
    return this.repository.alerte.update({
      where: { id },
      data: { statut: dto.statut },
      include: ALERTE_INCLUDE,
    });
  }

  async repondre(alerteId: string, donneurId: string, dto: CreateReponseDto) {
    const alerte = await this.getOrThrow(alerteId);

    if (alerte.statut !== 'OUVERTE') {
      throw new BadRequestException('Cette alerte est fermée, votre réponse ne peut plus être enregistrée.');
    }

    const donneur = await this.repository.utilisateur.findUnique({
      where: { id: donneurId },
      select: { groupeSanguin: true },
    });

    if (!donneur?.groupeSanguin) {
      throw new BadRequestException('Complétez votre groupe sanguin avant de répondre à une alerte.');
    }

    if (!isDonneurCompatible(donneur.groupeSanguin, alerte.groupeSanguinRequis)) {
      throw new ForbiddenException("Votre groupe sanguin n'est pas compatible avec cette alerte.");
    }

    return this.repository.reponse.upsert({
      where: { alerteId_donneurId: { alerteId, donneurId } },
      create: { alerteId, donneurId, statut: dto.statut },
      update: { statut: dto.statut, dateReponse: new Date() },
    });
  }

  async findReponses(alerteId: string) {
    await this.getOrThrow(alerteId);
    return this.repository.reponse.findMany({
      where: { alerteId },
      include: {
        donneur: { select: { id: true, nom: true, prenom: true, telephone: true, groupeSanguin: true } },
      },
      orderBy: { dateReponse: 'desc' },
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.repository.alerte.delete({ where: { id } });
    return { message: 'Alerte supprimée' };
  }

  private async getOrThrow(id: string) {
    const alerte = await this.repository.alerte.findUnique({ where: { id } });
    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }
    return alerte;
  }

  private async notifierDonneurs(
    alerte: {
      id: string;
      groupeSanguinRequis: Prisma.AlerteGetPayload<object>['groupeSanguinRequis'];
      quartier?: { nom: string } | null;
      centreDon?: { nom: string; adresse: string | null } | null;
    },
    donneursCibles: DonneurCible[],
  ) {
    if (donneursCibles.length === 0) {
      return 0;
    }

    const quartierNom = alerte.quartier?.nom ?? 'votre quartier';
    const groupeLabel = formatGroupeSanguin(alerte.groupeSanguinRequis);
    const centreInfo = alerte.centreDon
      ? ` Rendez-vous au centre ${alerte.centreDon.nom}${alerte.centreDon.adresse ? ` (${alerte.centreDon.adresse})` : ''}.`
      : '';
    const contenu = `Alerte don de sang : besoin urgent de ${groupeLabel} à ${quartierNom}.${centreInfo} Répondez « Je viens » si vous êtes disponible.`;
    const sujetEmail = `Alerte don de sang : ${groupeLabel} recherché`;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const envois = await Promise.all(
      donneursCibles.map(async (donneur) => {
        let emailEnvoye = false;
        if (donneur.email) {
          const token = this.genererTokenReponse(alerte.id, donneur.id);
          const html = genererEmailAlerte({
            prenom: donneur.prenom,
            groupeSanguinLabel: groupeLabel,
            quartierNom,
            centreNom: alerte.centreDon?.nom ?? null,
            centreAdresse: alerte.centreDon?.adresse ?? null,
            lienJeViens: `${frontendUrl}/reponse-alerte?token=${token}&statut=JE_VIENS`,
            lienIndisponible: `${frontendUrl}/reponse-alerte?token=${token}&statut=INDISPONIBLE`,
            lienConnexion: `${frontendUrl}/connexion`,
          });
          emailEnvoye = await this.mail.envoyer({ to: donneur.email, subject: sujetEmail, text: contenu, html });
        }
        const smsEnvoye = donneur.telephone ? await this.sms.envoyer({ to: donneur.telephone, content: contenu }) : false;
        return { donneurId: donneur.id, emailEnvoye, smsEnvoye };
      }),
    );

    await this.repository.notification.createMany({
      data: envois.map((envoi) => ({
        donneurId: envoi.donneurId,
        alerteId: alerte.id,
        type: 'PUSH' as const,
        contenu,
        emailEnvoye: envoi.emailEnvoye,
        smsEnvoye: envoi.smsEnvoye,
      })),
    });

    return donneursCibles.length;
  }

  private genererTokenReponse(alerteId: string, donneurId: string): string {
    const payload: TokenReponseEmail = { type: 'reponse_alerte', alerteId, donneurId };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '30d',
    });
  }

  private verifierTokenReponse(token: string): TokenReponseEmail {
    let payload: TokenReponseEmail;
    try {
      payload = this.jwtService.verify<TokenReponseEmail>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('Ce lien de réponse est invalide ou a expiré.');
    }

    if (payload.type !== 'reponse_alerte') {
      throw new BadRequestException('Ce lien de réponse est invalide.');
    }

    return payload;
  }

  /** Répond à une alerte depuis le lien cliqué dans l'email, sans connexion préalable. */
  async repondreParEmail(token: string, statut: StatutReponse) {
    const payload = this.verifierTokenReponse(token);
    return this.repondre(payload.alerteId, payload.donneurId, { statut });
  }

  /** Aperçu (lecture seule) de l'alerte visée par un lien de réponse par email, pour la page de confirmation. */
  async apercuReponseEmail(token: string) {
    const payload = this.verifierTokenReponse(token);
    const alerte = await this.repository.alerte.findUnique({
      where: { id: payload.alerteId },
      include: { quartier: true, centreDon: true },
    });
    if (!alerte) {
      throw new NotFoundException('Alerte introuvable');
    }

    const donneur = await this.repository.utilisateur.findUnique({
      where: { id: payload.donneurId },
      select: { prenom: true },
    });

    const maReponse = await this.repository.reponse.findUnique({
      where: { alerteId_donneurId: { alerteId: payload.alerteId, donneurId: payload.donneurId } },
    });

    return {
      prenom: donneur?.prenom ?? '',
      groupeSanguinRequis: alerte.groupeSanguinRequis,
      quartierNom: alerte.quartier.nom,
      centreNom: alerte.centreDon?.nom ?? null,
      centreAdresse: alerte.centreDon?.adresse ?? null,
      alerteOuverte: alerte.statut === 'OUVERTE',
      maReponse: maReponse?.statut ?? null,
    };
  }

  /**
   * Trouve les donneurs éligibles d'un quartier (groupe compatible, actifs) puis les
   * répartit vers le centre sélectionné le plus proche — chaque donneur n'est notifié
   * qu'une fois même si plusieurs centres sont choisis. Quand un plafond est fixé, seuls
   * les donneurs géolocalisés les plus proches de leur centre assigné sont retenus (ceux
   * sans coordonnées passent en dernier).
   */
  private async repartirDonneursDuQuartier(
    groupeSanguinRequis: Prisma.AlerteGetPayload<object>['groupeSanguinRequis'],
    quartierId: string,
    centreDonIds: string[],
    centres: { id: string; latitude: number | null; longitude: number | null }[],
    nombreDonneursMax: number | undefined,
  ): Promise<Map<string, DonneurCible[]>> {
    const groupesCompatibles = getCompatibleDonorGroups(groupeSanguinRequis);

    const donneurs = await this.repository.utilisateur.findMany({
      where: {
        role: Role.DONNEUR,
        statut: 'ACTIF',
        groupeSanguin: { in: groupesCompatibles },
        quartierId,
      },
      select: { id: true, prenom: true, email: true, telephone: true, latitude: true, longitude: true },
    });

    const centreParDefaut = centreDonIds[0];

    const avecCentreAssigne = donneurs.map((donneur) => {
      let centreId = centreParDefaut;
      let distance = Infinity;
      if (donneur.latitude != null && donneur.longitude != null) {
        for (const centre of centres) {
          if (centre.latitude == null || centre.longitude == null) continue;
          const d = distanceKm(
            { lat: donneur.latitude, lng: donneur.longitude },
            { lat: centre.latitude, lng: centre.longitude },
          );
          if (d < distance) {
            distance = d;
            centreId = centre.id;
          }
        }
      }
      return {
        id: donneur.id,
        prenom: donneur.prenom,
        email: donneur.email,
        telephone: donneur.telephone,
        centreId,
        distance,
      };
    });

    avecCentreAssigne.sort((a, b) => a.distance - b.distance);
    const selectionnes = nombreDonneursMax ? avecCentreAssigne.slice(0, nombreDonneursMax) : avecCentreAssigne;

    const repartition = new Map<string, DonneurCible[]>();
    for (const donneur of selectionnes) {
      const liste = repartition.get(donneur.centreId) ?? [];
      liste.push({ id: donneur.id, prenom: donneur.prenom, email: donneur.email, telephone: donneur.telephone });
      repartition.set(donneur.centreId, liste);
    }
    return repartition;
  }
}
