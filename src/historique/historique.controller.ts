import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { FindHistoriqueQuery } from './dto/find-historique.query';
import { HistoriqueService } from './historique.service';

@ApiTags('historique')
@ApiBearerAuth()
@Controller('historique')
export class HistoriqueController {
  constructor(private readonly historiqueService: HistoriqueService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({
    summary: 'Historique des actions des utilisateurs',
    description:
      'Le SUPERADMIN voit toutes les actions. Un ADMIN ne voit que celles des agents CNTS, médecins et donneurs.',
  })
  findAll(
    @Query() query: FindHistoriqueQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.historiqueService.findAll(query, user);
  }
}
