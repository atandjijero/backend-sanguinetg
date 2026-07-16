import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { AuthService } from './auth.service';
import { DemandeReinitialisationDto } from './dto/demande-reinitialisation.dto';
import { LoginDto } from './dto/login.dto';
import { ReinitialiserMotDePasseDto } from './dto/reinitialiser-mot-de-passe.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/authenticated-user.interface';

const REFRESH_COOKIE_NAME = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private refreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: "Inscription d'un nouveau donneur" })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, this.refreshCookieOptions());
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Connexion par email/téléphone + mot de passe' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.login(dto.identifiant, dto.motDePasse, req.ip, req.headers['user-agent']);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, this.refreshCookieOptions());
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: "Renouvellement de l'access token via le cookie de refresh" })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as JwtPayload;
    const tokens = await this.authService.refresh(payload);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, this.refreshCookieOptions());
    return { accessToken: tokens.accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Déconnexion (suppression du cookie de refresh)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
    return { message: 'Déconnecté' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('mot-de-passe-oublie')
  @ApiOperation({ summary: "Demande de réinitialisation de mot de passe (envoi d'un lien par email)" })
  demanderReinitialisation(@Body() dto: DemandeReinitialisationDto) {
    return this.authService.demanderReinitialisation(dto.identifiant);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reinitialiser-mot-de-passe')
  @ApiOperation({ summary: 'Réinitialisation du mot de passe via le token reçu par email' })
  reinitialiserMotDePasse(@Body() dto: ReinitialiserMotDePasseDto) {
    return this.authService.reinitialiserMotDePasse(dto.token, dto.nouveauMotDePasse);
  }
}
