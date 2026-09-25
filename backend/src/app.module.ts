import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlumnosModule } from './alumnos/alumnos.module';
import { ProfesorasModule } from './profesoras/profesoras.module';
import { CursosModule } from './cursos/cursos.module';
import { InscripcionesModule } from './inscripciones/inscripciones.module';
import { CuotasModule } from './cuotas/cuotas.module';
import { PagosModule } from './pagos/pagos.module';
import { PrismaModule } from './prisma/prisma.module';
import { HorariosCursoModule } from './horarios-curso/horarios-curso.module';
//import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
//import { AuthNoSepcService } from './auth--no-sepc/auth--no-sepc.service';

@Module({
  imports: [

    AlumnosModule,
    ProfesorasModule,
    CursosModule,
    InscripcionesModule,
    CuotasModule,
    PagosModule,
    PrismaModule,
    HorariosCursoModule,
    //UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService /*AuthNoSepcService*/],
})
export class AppModule {}
