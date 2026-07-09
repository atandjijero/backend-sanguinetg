import { GroupeSanguin } from '@prisma/client';

/**
 * Groupes sanguins donneurs compatibles pour un groupe receveur donné
 * (compatibilité ABO + Rhésus standard, hors sous-groupes rares).
 */
const COMPATIBLE_DONOR_GROUPS: Record<GroupeSanguin, GroupeSanguin[]> = {
  O_NEGATIF: ['O_NEGATIF'],
  O_POSITIF: ['O_NEGATIF', 'O_POSITIF'],
  A_NEGATIF: ['O_NEGATIF', 'A_NEGATIF'],
  A_POSITIF: ['O_NEGATIF', 'O_POSITIF', 'A_NEGATIF', 'A_POSITIF'],
  B_NEGATIF: ['O_NEGATIF', 'B_NEGATIF'],
  B_POSITIF: ['O_NEGATIF', 'O_POSITIF', 'B_NEGATIF', 'B_POSITIF'],
  AB_NEGATIF: ['O_NEGATIF', 'A_NEGATIF', 'B_NEGATIF', 'AB_NEGATIF'],
  AB_POSITIF: [
    'O_NEGATIF',
    'O_POSITIF',
    'A_NEGATIF',
    'A_POSITIF',
    'B_NEGATIF',
    'B_POSITIF',
    'AB_NEGATIF',
    'AB_POSITIF',
  ],
};

export function getCompatibleDonorGroups(groupeReceveur: GroupeSanguin): GroupeSanguin[] {
  return COMPATIBLE_DONOR_GROUPS[groupeReceveur];
}

export function isDonneurCompatible(groupeDonneur: GroupeSanguin, groupeReceveur: GroupeSanguin): boolean {
  return COMPATIBLE_DONOR_GROUPS[groupeReceveur].includes(groupeDonneur);
}

/** Groupes receveurs auxquels un donneur donné peut donner (relation inverse). */
export function getCompatibleRecipientGroups(groupeDonneur: GroupeSanguin): GroupeSanguin[] {
  return (Object.keys(COMPATIBLE_DONOR_GROUPS) as GroupeSanguin[]).filter((groupeReceveur) =>
    COMPATIBLE_DONOR_GROUPS[groupeReceveur].includes(groupeDonneur),
  );
}

const DISPLAY_LABELS: Record<GroupeSanguin, string> = {
  O_NEGATIF: 'O-',
  O_POSITIF: 'O+',
  A_NEGATIF: 'A-',
  A_POSITIF: 'A+',
  B_NEGATIF: 'B-',
  B_POSITIF: 'B+',
  AB_NEGATIF: 'AB-',
  AB_POSITIF: 'AB+',
};

export function formatGroupeSanguin(groupe: GroupeSanguin): string {
  return DISPLAY_LABELS[groupe];
}
