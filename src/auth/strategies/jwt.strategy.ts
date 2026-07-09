import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RepositoryService } from '../../repository/repository.service';
import type { AuthenticatedUser, JwtPayload } from '../types/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly repository: RepositoryService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.repository.utilisateur.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, statut: true },
    });

    if (!user || user.statut !== 'ACTIF') {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    return { id: user.id, role: user.role, email: user.email };
  }
}
