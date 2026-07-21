import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  constructor() {
    // Configuré ici (et non au chargement du module) car le module est importé,
    // donc évalué, avant que ConfigModule.forRoot() ait chargé le .env dans process.env.
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  upload(
    file: Buffer,
    folder: string,
    resourceType: 'image' | 'video' | 'auto' = 'image',
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Échec de l'envoi du fichier vers Cloudinary"));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(file);
    });
  }

  async destroy(publicId: string, resourceType: 'image' | 'video' | 'auto' = 'image'): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}
