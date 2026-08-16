import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/** Remplace le message anglais par défaut de @nestjs/throttler par un message en français, cohérent avec le reste de l'app. */
@Injectable()
export class FrenchThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      'Trop de tentatives, réessayez dans un instant.',
    );
  }
}
