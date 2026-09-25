import type { IncomingMessage, ServerResponse } from 'http';
import express, { type Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../dist/src/app.module';
import { configureApp } from '../dist/src/create-app';

// Cachea la app entre invocaciones de la misma instancia de la función serverless.
let cachedApp: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  if (!cachedApp) {
    const expressInstance = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressInstance),
    );

    configureApp(app);
    await app.init();

    cachedApp = expressInstance;
  }

  return cachedApp;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await bootstrapServer();
  app(req, res);
}
