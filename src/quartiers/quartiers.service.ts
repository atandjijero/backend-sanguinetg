import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RepositoryService } from '../repository/repository.service';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { CreateQuartierDto } from './dto/create-quartier.dto';
import { UpdateQuartierDto } from './dto/update-quartier.dto';

@Injectable()
export class QuartiersService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly geocoding: GeocodingService,
  ) {}

  findAll() {
    return this.repository.quartier.findMany({ orderBy: { nom: 'asc' } });
  }

  async findOne(id: string) {
    const quartier = await this.repository.quartier.findUnique({ where: { id } });
    if (!quartier) {
      throw new NotFoundException('Quartier introuvable');
    }
    return quartier;
  }

  async create(dto: CreateQuartierDto) {
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (latitude === undefined || longitude === undefined) {
      const coords = await this.geocoding.geocoderLome(dto.nom);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }

    try {
      return await this.repository.quartier.create({ data: { ...dto, latitude, longitude } });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateQuartierDto) {
    await this.findOne(id);
    try {
      return await this.repository.quartier.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.mapPrismaError(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.repository.quartier.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Ce quartier est utilisé par des utilisateurs ou des alertes et ne peut pas être supprimé.');
      }
      throw error;
    }
    return { message: 'Quartier supprimé' };
  }

  private mapPrismaError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Un quartier avec ce nom existe déjà.');
    }
    return error as Error;
  }
}
