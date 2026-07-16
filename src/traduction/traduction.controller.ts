import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { TraduireDto } from './dto/traduire.dto';
import { TraductionService } from './traduction.service';

@ApiTags('traduction')
@Controller('traduction')
export class TraductionController {
  constructor(private readonly traductionService: TraductionService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @ApiOperation({
    summary: 'Traduit une liste de textes (source français) via DeepL',
    description: "Utilisé par le sélecteur de langue du site (FR/EN). La clé DeepL reste côté serveur.",
  })
  async traduire(@Body() dto: TraduireDto) {
    const traductions = await this.traductionService.traduire(dto.textes, dto.langueCible);
    return { traductions };
  }
}
