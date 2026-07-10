import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.interface';
import { ContactService } from './contact.service';
import { CreateMessageContactDto } from './dto/create-message-contact.dto';
import { FindMessagesContactQuery } from './dto/find-messages-contact.query';
import { ReplyMessageContactDto } from './dto/reply-message-contact.dto';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Envoyer un message via le formulaire de contact public' })
  create(@Body() dto: CreateMessageContactDto) {
    return this.contactService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.AGENT_CNTS)
  @Get()
  @ApiOperation({ summary: 'Liste des messages reçus via le formulaire de contact' })
  findAll(@Query() query: FindMessagesContactQuery) {
    return this.contactService.findAll(query);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.AGENT_CNTS)
  @Patch(':id/reponse')
  @ApiOperation({ summary: 'Répondre à un message de contact (réponse envoyée par email à l\'expéditeur)' })
  repondre(@Param('id') id: string, @Body() dto: ReplyMessageContactDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contactService.repondre(id, dto, user.id);
  }
}
