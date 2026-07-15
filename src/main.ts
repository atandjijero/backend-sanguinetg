import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Sans ça, derrière un proxy/hébergeur (Render, Railway, nginx...), req.ip renvoie
  // l'IP du proxy (ou rien) au lieu de l'IP réelle du client — d'où les ipSource vides
  // dans les alertes de sécurité.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(
    helmet({
      // Swagger UI a besoin de styles/scripts inline pour s'afficher correctement.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:'],
          // La page Contact embarque une carte Google Maps (iframe officiel maps/embed) pour localiser le CNTS.
          frameSrc: [`'self'`, 'https://www.google.com'],
          'report-uri': ['/security/csp-report'],
        },
      },
    }),
  );
  app.use(cookieParser());

  // Les navigateurs envoient les rapports CSP avec Content-Type: application/csp-report
  // (voire application/reports+json) — hors du type accepté par le body-parser JSON
  // global. On lit le flux manuellement pour ne pas ajouter une 2e instance d'express.json()
  // (qui perturbe le parsing du body sur le reste de l'API).
  app.use('/security/csp-report', (req: Request, _res: Response, next: NextFunction) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        req.body = data ? JSON.parse(data) : {};
      } catch {
        req.body = {};
      }
      next();
    });
  });

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sanguine TG API')
    .setDescription(
      'API de la plateforme de mobilisation et de prise en charge des donneurs de sang du CNTS (pilote Lomé).',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`Swagger disponible sur http://localhost:${port}/docs`);
}
bootstrap();
