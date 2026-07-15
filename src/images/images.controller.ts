import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CleImage, Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ImagesService } from './images.service';

@ApiTags('images-accueil')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Images actuelles de la page d'accueil — public" })
  findAll() {
    return this.imagesService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Post(':cle')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Seuls les fichiers image sont acceptés'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: "Remplacer une image de la page d'accueil (Cloudinary)" })
  upload(@Param('cle', new ParseEnumPipe(CleImage)) cle: CleImage, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    return this.imagesService.upload(cle, file.buffer);
  }
}
