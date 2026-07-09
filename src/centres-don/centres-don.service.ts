import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { CreateCentreDonDto } from './dto/create-centre-don.dto';
import { UpdateCentreDonDto } from './dto/update-centre-don.dto';

@Injectable()
export class CentresDonService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly geocoding: GeocodingService,
  ) {}

  findAll() {
    return this.repository.centreDon.findMany({
      include: { quartier: true },
      orderBy: { nom: 'asc' },
    });
  }

  async findOne(id: string) {
    const centre = await this.repository.centreDon.findUnique({ where: { id }, include: { quartier: true } });
    if (!centre) {
      throw new NotFoundException('Centre de don introuvable');
    }
    return centre;
  }

  async create(dto: CreateCentreDonDto) {
    const { latitude, longitude } = await this.resoudreCoordonnees(dto.nom, dto.quartierId, dto.latitude, dto.longitude);

    try {
      return await this.repository.centreDon.create({
        data: { ...dto, latitude, longitude },
        include: { quartier: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateCentreDonDto) {
    const existant = await this.findOne(id);

    let latitude = dto.latitude;
    let longitude = dto.longitude;

    // Si le centre n'a toujours pas de coordonnées, on retente (utile si un quartier vient d'être renseigné).
    if (latitude === undefined && longitude === undefined && existant.latitude === null) {
      const resolues = await this.resoudreCoordonnees(
        dto.nom ?? existant.nom,
        dto.quartierId !== undefined ? dto.quartierId : existant.quartierId,
        undefined,
        undefined,
      );
      latitude = resolues.latitude;
      longitude = resolues.longitude;
    }

    try {
      return await this.repository.centreDon.update({
        where: { id },
        data: { ...dto, latitude, longitude },
        include: { quartier: true },
      });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  /**
   * Résout les coordonnées d'un centre : valeurs fournies explicitement > géocodage
   * précis (nom + quartier) > coordonnées du quartier de rattachement en repli, puisque
   * le géocodage échoue souvent sur un nom de centre trop spécifique/inexistant sur la carte.
   */
  private async resoudreCoordonnees(
    nom: string,
    quartierId: string | null | undefined,
    latitude: number | undefined,
    longitude: number | undefined,
  ): Promise<{ latitude: number | undefined; longitude: number | undefined }> {
    if (latitude !== undefined && longitude !== undefined) {
      return { latitude, longitude };
    }

    const quartier = quartierId ? await this.repository.quartier.findUnique({ where: { id: quartierId } }) : null;

    const requete = [nom, quartier?.nom].filter(Boolean).join(', ');
    const coords = await this.geocoding.geocoderLome(requete);
    if (coords) {
      return coords;
    }

    if (quartier?.latitude != null && quartier?.longitude != null) {
      return { latitude: quartier.latitude, longitude: quartier.longitude };
    }

    return { latitude: undefined, longitude: undefined };
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.repository.centreDon.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Ce centre est utilisé par des dons enregistrés et ne peut pas être supprimé.');
      }
      throw error;
    }
    return { message: 'Centre de don supprimé' };
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('Un centre de don avec ce nom existe déjà.');
      }
      if (error.code === 'P2003') {
        return new BadRequestException('Le quartier sélectionné est invalide.');
      }
    }
    return error as Error;
  }
}
