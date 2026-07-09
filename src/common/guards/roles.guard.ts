import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

    // SUPERADMIN a systématiquement accès à tout ce qui est réservé à un rôle plus bas.
    if (user?.role === Role.SUPERADMIN) {
      return true;
    }

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Vous n'avez pas les droits requis pour accéder à cette ressource.");
    }

    return true;
  }
}
