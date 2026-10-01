export const ROUTES_IGNOREES = new Set([
  'POST /auth/refresh',
  'POST /analytics/heartbeat',
  'POST /analytics/heartbeat/deconnexion',
  'POST /traduction',
  'POST /security/csp-report',
  'POST /push/subscribe',
  'DELETE /push/subscribe',
  'PATCH /notifications/:id/lue',
  'PATCH /notifications/lues',
]);

export const LIBELLES_ACTIONS: Record<string, string> = {
  'POST /auth/login': 'Connexion',
  'POST /auth/logout': 'Déconnexion',
  'POST /auth/register': 'Inscription donneur',
  'POST /auth/verifier-email': "Vérification de l'adresse email",
  'POST /auth/mot-de-passe-oublie':
    'Demande de réinitialisation du mot de passe',
  'POST /auth/reinitialiser-mot-de-passe': 'Réinitialisation du mot de passe',

  'PATCH /users/me': 'Modification de son profil',
  'PATCH /users/me/password': 'Changement de mot de passe',
  'POST /users/staff': "Création d'un compte du personnel",
  'PATCH /users/:id/statut': "Activation / désactivation d'un compte",
  'PATCH /users/:id/groupe-sanguin':
    "Modification du groupe sanguin d'un donneur",
  'DELETE /users/staff/:id': "Suppression d'un membre du personnel",
  'DELETE /users/:id': "Suppression d'un donneur",

  'POST /alertes': "Création d'une alerte",
  'PATCH /alertes/:id/statut': "Changement de statut d'une alerte",
  'POST /alertes/:id/relancer': "Relance d'une alerte",
  'DELETE /alertes/:id': "Suppression d'une alerte",
  'POST /alertes/:id/reponses': 'Réponse à une alerte',
  'POST /alertes/reponse-email': 'Réponse à une alerte (lien email)',

  'POST /carnets': "Enregistrement d'un don",
  'PATCH /carnets/:id': "Modification d'un carnet de don",

  'POST /recompenses': "Attribution d'une récompense",
  'PATCH /recompenses/:id/statut': "Changement de statut d'une récompense",

  'POST /conseils': "Publication d'un conseil santé",
  'PATCH /conseils/:id': "Modification d'un conseil santé",
  'DELETE /conseils/:id': "Suppression d'un conseil santé",

  'POST /quartiers': "Ajout d'un quartier",
  'PATCH /quartiers/:id': "Modification d'un quartier",
  'DELETE /quartiers/:id': "Suppression d'un quartier",

  'POST /centres-don': "Ajout d'un centre de collecte",
  'PATCH /centres-don/:id': "Modification d'un centre de collecte",
  'DELETE /centres-don/:id': "Suppression d'un centre de collecte",

  'POST /contact': 'Envoi du formulaire de contact',
  'PATCH /contact/:id/reponse': 'Réponse à un message de contact',

  'POST /messagerie/messages': "Envoi d'un message",
  'POST /messagerie/messages/vocal': "Envoi d'un message vocal",
  'PATCH /messagerie/messages/:id': "Modification d'un message",
  'DELETE /messagerie/messages/:id': "Suppression d'un message",

  'POST /images/:cle': "Mise à jour d'une image du site",
  'POST /newsletter': 'Inscription à la newsletter',
  'POST /avis': "Dépôt d'un avis",
  'DELETE /security/alertes': 'Suppression des alertes de sécurité',
  'DELETE /security/alertes/:id': "Suppression d'une alerte de sécurité",
};
