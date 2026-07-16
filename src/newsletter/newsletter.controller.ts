import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateAbonneDto } from './dto/create-abonne.dto';
import { NewsletterService } from './newsletter.service';

@ApiTags('newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: "Inscription à la newsletter (popup du site public)" })
  abonner(@Body() dto: CreateAbonneDto) {
    return this.newsletterService.abonner(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get()
  @ApiOperation({ summary: 'Liste des abonnés à la newsletter (superadmin uniquement)' })
  findAll() {
    return this.newsletterService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Get('stats')
  @ApiOperation({ summary: "Nombre total d'abonnés à la newsletter (superadmin uniquement)" })
  stats() {
    return this.newsletterService.stats();
  }
}
