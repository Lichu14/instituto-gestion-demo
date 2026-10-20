import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { demoReadonly } from './demo-readonly';

export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: ['http://localhost:4201', 'https://instituto-gestion-demo.vercel.app'],
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // El bloqueo debe incluir CORS para que el frontend pueda leer el aviso 403.
  app.use(demoReadonly);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const config = new DocumentBuilder().setTitle('Instituto Gestión · Demo API')
    .setDescription('Datos ficticios. La demo pública permite consultas y exportaciones; las escrituras están bloqueadas.')
    .setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api', app, () => SwaggerModule.createDocument(app, config));
}
