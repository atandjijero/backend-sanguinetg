import { Injectable } from '@nestjs/common';
import { CleImage } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class ImagesService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findAll() {
    return this.repository.imageAccueil.findMany();
  }

  async upload(cle: CleImage, file: Buffer) {
    const { url, publicId } = await this.cloudinary.upload(file, 'sanguine-tg/accueil');

    const existante = await this.repository.imageAccueil.findUnique({ where: { cle } });
    if (existante) {
      await this.cloudinary.destroy(existante.cloudinaryId).catch(() => undefined);
    }

    return this.repository.imageAccueil.upsert({
      where: { cle },
      create: { cle, url, cloudinaryId: publicId },
      update: { url, cloudinaryId: publicId },
    });
  }
}
