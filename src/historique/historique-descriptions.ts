import {
  GroupeSanguin,
  Role,
  StatutRecompense,
  StatutReponse,
  TypeRecompense,
} from '@prisma/client';
import { formatGroupeSanguin } from '../common/constants/blood-compatibility';
import { TYPE_RECOMPENSE_LABELS } from '../recompenses/recompense-labels';
import { RepositoryService } from '../repository/repository.service';
import { LIBELLES_ACTIONS } from './historique-actions';

type Objet = Record<string, unknown>;

export interface ContexteDescription {
  cle: string;
  cible: string | null;
  body: Objet;
  resultat: unknown;
  succes: boolean;
  erreur: string | null;
}

const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'super administrateur',
  ADMIN: 'administrateur',
  MEDECIN: 'médecin',
  AGENT_CNTS: 'agent CNTS',
  DONNEUR: 'donneur',
};

const STATUT_REPONSE_LABELS: Record<StatutReponse, string> = {
  JE_VIENS: 'Je viens',
  INDISPONIBLE: 'Indisponible',
};

const STATUT_RECOMPENSE_LABELS: Record<StatutRecompense, string> = {
  ATTRIBUEE: 'attribuée',
  UTILISEE: 'utilisée',
  EXPIREE: 'expirée',
};

const CHAMPS_PROFIL: Record<string, string> = {
  nom: 'nom',
  prenom: 'prénom',
  telephone: 'téléphone',
  dateNaissance: 'date de naissance',
  quartierId: 'zone',
};

const texte = (valeur: unknown) => (typeof valeur === 'string' ? valeur : '');
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const dateFr = (valeur: unknown) =>
  valeur
    ? new Date(valeur as string).toLocaleDateString('fr-FR', {
        timeZone: 'UTC',
      })
    : '';
const groupe = (valeur: unknown) =>
  typeof valeur === 'string' && valeur in GroupeSanguin
    ? formatGroupeSanguin(valeur as GroupeSanguin)
    : '';

async function nomUtilisateur(repository: RepositoryService, id: unknown) {
  if (typeof id !== 'string') return 'un utilisateur';
  const u = await repository.utilisateur.findUnique({
    where: { id },
    select: { nom: true, prenom: true },
  });
  return u ? `${u.prenom} ${u.nom}` : 'un utilisateur';
}

async function libelleAlerte(repository: RepositoryService, id: string) {
  const a = await repository.alerte.findUnique({
    where: { id },
    select: {
      groupeSanguinRequis: true,
      quartier: { select: { nom: true } },
      centreDon: { select: { nom: true } },
    },
  });
  if (!a) return null;
  const centre = a.centreDon ? ` (${a.centreDon.nom})` : '';
  return `${formatGroupeSanguin(a.groupeSanguinRequis)} de ${a.quartier.nom}${centre}`;
}

export async function chargerCible(
  repository: RepositoryService,
  cle: string,
  id: string | undefined,
): Promise<string | null> {
  if (!id) return null;
  const route = cle.split(' ')[1];

  if (route.startsWith('/users/')) {
    return nomUtilisateur(repository, id);
  }
  if (route.startsWith('/alertes/')) {
    return libelleAlerte(repository, id);
  }
  if (route.startsWith('/carnets/')) {
    const c = await repository.carnetDigital.findUnique({
      where: { id },
      select: {
        dateDon: true,
        donneur: { select: { nom: true, prenom: true } },
      },
    });
    return c
      ? `don de ${c.donneur.prenom} ${c.donneur.nom} du ${dateFr(c.dateDon)}`
      : null;
  }
  if (route.startsWith('/recompenses/')) {
    const r = await repository.recompense.findUnique({
      where: { id },
      select: { type: true, donneur: { select: { nom: true, prenom: true } } },
    });
    return r
      ? `récompense « ${TYPE_RECOMPENSE_LABELS[r.type]} » de ${r.donneur.prenom} ${r.donneur.nom}`
      : null;
  }
  if (route.startsWith('/conseils/')) {
    const c = await repository.conseilSante.findUnique({
      where: { id },
      select: { titre: true },
    });
    return c ? `« ${c.titre} »` : null;
  }
  if (route.startsWith('/quartiers/')) {
    const q = await repository.quartier.findUnique({
      where: { id },
      select: { nom: true },
    });
    return q?.nom ?? null;
  }
  if (route.startsWith('/centres-don/')) {
    const c = await repository.centreDon.findUnique({
      where: { id },
      select: { nom: true },
    });
    return c?.nom ?? null;
  }
  if (route.startsWith('/contact/')) {
    const m = await repository.messageContact.findUnique({
      where: { id },
      select: { nomComplet: true, sujet: true },
    });
    return m ? `message de ${m.nomComplet} (« ${m.sujet} »)` : null;
  }
  return null;
}

export async function decrire(
  repository: RepositoryService,
  ctx: ContexteDescription,
): Promise<string> {
  const { cle, body, succes, erreur } = ctx;
  const cible = ctx.cible ?? 'élément supprimé';
  const r = (ctx.resultat ?? {}) as Objet;

  if (!succes) {
    if (cle === 'POST /auth/login') {
      return `Tentative de connexion échouée avec l'identifiant « ${texte(body.identifiant)} » : ${erreur ?? 'erreur inconnue'}`;
    }
    const libelle = LIBELLES_ACTIONS[cle] ?? cle;
    const sur = ctx.cible ? ` (${ctx.cible})` : '';
    return `Échec : ${libelle.charAt(0).toLowerCase()}${libelle.slice(1)}${sur} — ${erreur ?? 'erreur inconnue'}`;
  }

  switch (cle) {
    case 'POST /auth/login':
      return "S'est connecté à la plateforme";
    case 'POST /auth/logout':
      return "S'est déconnecté";
    case 'POST /auth/register':
      return `S'est inscrit comme donneur (${texte(body.email)})`;
    case 'POST /auth/verifier-email':
      return 'A vérifié son adresse email';
    case 'POST /auth/mot-de-passe-oublie':
      return `A demandé la réinitialisation du mot de passe pour « ${texte(body.identifiant)} »`;
    case 'POST /auth/reinitialiser-mot-de-passe':
      return 'A réinitialisé son mot de passe';

    case 'PATCH /users/me': {
      const champs = Object.keys(body)
        .map((champ) => CHAMPS_PROFIL[champ])
        .filter(Boolean);
      return champs.length
        ? `A modifié son profil (${champs.join(', ')})`
        : 'A modifié son profil';
    }
    case 'PATCH /users/me/password':
      return 'A changé son mot de passe';
    case 'POST /users/staff': {
      const role = texte(body.role) as Role;
      return `A créé le compte ${ROLE_LABELS[role] ?? ''} de ${texte(body.prenom)} ${texte(body.nom)}`;
    }
    case 'PATCH /users/:id/statut':
      return body.statut === 'ACTIF'
        ? `A activé le compte de ${cible}`
        : `A désactivé le compte de ${cible}`;
    case 'PATCH /users/:id/groupe-sanguin':
      return `A défini le groupe sanguin de ${cible} : ${groupe(body.groupeSanguin)}`;
    case 'DELETE /users/staff/:id': {
      const raison = texte(body.raison);
      return `A supprimé le membre du personnel ${cible}${raison ? ` — raison : ${raison}` : ''}`;
    }
    case 'DELETE /users/:id':
      return `A supprimé le compte donneur de ${cible}`;

    case 'POST /alertes': {
      const alertes = Array.isArray(ctx.resultat)
        ? (ctx.resultat as Objet[])
        : [];
      const unique = (valeurs: string[]) =>
        [...new Set(valeurs.filter(Boolean))].join(', ');
      const groupes = unique(alertes.map((a) => groupe(a.groupeSanguinRequis)));
      const quartiers = unique(
        alertes.map((a) => texte((a.quartier as Objet | null)?.nom)),
      );
      const centres = unique(
        alertes.map((a) => texte((a.centreDon as Objet | null)?.nom)),
      );
      const notifies = alertes.reduce(
        (total, a) => total + (Number(a.donneursNotifies) || 0),
        0,
      );
      return `A lancé ${pluriel(alertes.length, 'alerte')} ${groupes} pour ${quartiers}${centres ? ` (${centres})` : ''} — ${pluriel(notifies, 'donneur')} ${notifies > 1 ? 'notifiés' : 'notifié'}`;
    }
    case 'PATCH /alertes/:id/statut':
      return body.statut === 'FERMEE'
        ? `A fermé l'alerte ${cible}`
        : `A rouvert l'alerte ${cible}`;
    case 'POST /alertes/:id/relancer': {
      const n = Number(r.donneursNotifies) || 0;
      return `A relancé l'alerte ${cible} — ${pluriel(n, 'donneur')} ${n > 1 ? 'renotifiés' : 'renotifié'}`;
    }
    case 'DELETE /alertes/:id':
      return `A supprimé l'alerte ${cible}`;
    case 'POST /alertes/:id/reponses':
      return `A répondu « ${STATUT_REPONSE_LABELS[body.statut as StatutReponse] ?? ''} » à l'alerte ${cible}`;
    case 'POST /alertes/reponse-email': {
      const alerte =
        typeof r.alerteId === 'string'
          ? await libelleAlerte(repository, r.alerteId)
          : null;
      return `A répondu « ${STATUT_REPONSE_LABELS[body.statut as StatutReponse] ?? ''} » à l'alerte ${alerte ?? ''} (via le lien email)`;
    }

    case 'POST /carnets': {
      const donneur = await nomUtilisateur(repository, body.donneurId);
      const centre = texte((r.centreDon as Objet | null)?.nom);
      return `A enregistré le don de ${donneur}${centre ? ` au centre ${centre}` : ''} le ${dateFr(body.dateDon)}${body.reponseId ? ' (suite à une alerte)' : ''}`;
    }
    case 'PATCH /carnets/:id':
      return body.recompenseId
        ? `A associé une récompense au ${cible}`
        : `A modifié le ${cible}`;

    case 'POST /recompenses': {
      const donneur = await nomUtilisateur(repository, body.donneurId);
      const type = TYPE_RECOMPENSE_LABELS[body.type as TypeRecompense] ?? '';
      return `A attribué la récompense « ${type} : ${texte(body.description)} » à ${donneur}`;
    }
    case 'PATCH /recompenses/:id/statut':
      return `A marqué la ${cible} comme ${STATUT_RECOMPENSE_LABELS[body.statut as StatutRecompense] ?? ''}`;

    case 'POST /conseils':
      return `A publié le conseil santé « ${texte(body.titre)} »`;
    case 'PATCH /conseils/:id':
      return `A modifié le conseil santé ${cible}`;
    case 'DELETE /conseils/:id':
      return `A supprimé le conseil santé ${cible}`;

    case 'POST /quartiers':
      return `A ajouté le quartier ${texte(body.nom)}`;
    case 'PATCH /quartiers/:id':
      return body.nom && body.nom !== ctx.cible
        ? `A renommé le quartier ${cible} en ${texte(body.nom)}`
        : `A modifié le quartier ${cible}`;
    case 'DELETE /quartiers/:id':
      return `A supprimé le quartier ${cible}`;

    case 'POST /centres-don':
      return `A ajouté le centre de collecte ${texte(body.nom)}`;
    case 'PATCH /centres-don/:id':
      return body.nom && body.nom !== ctx.cible
        ? `A renommé le centre de collecte ${cible} en ${texte(body.nom)}`
        : `A modifié le centre de collecte ${cible}`;
    case 'DELETE /centres-don/:id':
      return `A supprimé le centre de collecte ${cible}`;

    case 'POST /contact':
      return `${texte(body.nomComplet)} (${texte(body.email)}) a envoyé un message via le formulaire de contact : « ${texte(body.sujet)} »`;
    case 'PATCH /contact/:id/reponse':
      return `A répondu au ${cible}`;

    case 'POST /messagerie/messages':
      return 'A envoyé un message dans la messagerie';
    case 'POST /messagerie/messages/vocal':
      return 'A envoyé un message vocal dans la messagerie';
    case 'PATCH /messagerie/messages/:id':
      return 'A modifié un message de la messagerie';
    case 'DELETE /messagerie/messages/:id':
      return 'A supprimé un message de la messagerie';

    case 'POST /images/:cle':
      return "A mis à jour une image de la page d'accueil";
    case 'POST /newsletter':
      return `A inscrit ${texte(body.email)} à la newsletter`;
    case 'POST /avis':
      return `A donné son avis sur la plateforme (${Number(body.note) || 0}/5)`;
    case 'DELETE /security/alertes':
      return 'A supprimé des alertes de sécurité';
    case 'DELETE /security/alertes/:id':
      return 'A supprimé une alerte de sécurité';
  }

  return LIBELLES_ACTIONS[cle] ?? cle;
}
