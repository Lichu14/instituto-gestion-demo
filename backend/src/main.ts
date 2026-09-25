import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './create-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

configureApp(app);

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
