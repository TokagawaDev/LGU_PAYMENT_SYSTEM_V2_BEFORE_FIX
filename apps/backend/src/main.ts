/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import express from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

/**
 * Escape a string for safe use inside a RegExp
 */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Swagger UI to work
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  
  // Cookie parser middleware
  app.use(cookieParser());

  // Enable raw body for PayMongo webhooks signature verification
  app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
  
  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Serve static assets for uploaded files
  const publicDir = join(process.cwd(), 'public');
  app.use('/uploads', express.static(join(publicDir, 'uploads')));
  
  // Enable CORS with secure settings
  const cookieDomainEnv = process.env.COOKIE_DOMAIN;
  const normalizedCookieDomain = cookieDomainEnv?.replace(/^\./, '');
  const cookieDomainRegex = normalizedCookieDomain
    ? new RegExp(`^https:\\/\\/([a-z0-9-]+\\.)?${escapeRegExp(normalizedCookieDomain)}$`, 'i')
    : undefined;

  const allowedOrigins: Array<string | RegExp> = [
    'http://localhost:3000',
    'http://localhost:4200',
    process.env.FRONTEND_URL as string,
  ];

  if (process.env.NODE_ENV === 'production' && cookieDomainRegex) {
    allowedOrigins.push(cookieDomainRegex);
  }

  const filteredAllowedOrigins = allowedOrigins.filter((o): o is string | RegExp => Boolean(o));
  app.enableCors({
    origin: filteredAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Skip-Refresh', 'x-skip-refresh'],
    exposedHeaders: ['Set-Cookie'],
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('LGU Payment System API')
    .setDescription('API documentation for the LGU Payment System')
    .setVersion('1.0')
    .addTag('Authentication', 'User authentication endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('access-token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access-token',
      description: 'JWT token stored in HTTP-only cookie',
    })
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(
    `📚 Swagger documentation: http://localhost:${port}/${globalPrefix}/docs`
  );
}

bootstrap();
