import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marque une route comme accessible sans authentification.
 * Utilisé par JwtAuthGuard (appliqué globalement) pour laisser passer login/register.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
