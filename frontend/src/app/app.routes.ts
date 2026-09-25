import { Routes } from '@angular/router';
import { MainLayout } from './shared/layout/main-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { AlumnosList } from './pages/alumnos/alumnos-list/alumnos-list';
import { AlumnoCreate } from './pages/alumnos/alumno-create/alumno-create';
import { AlumnoDetail } from './pages/alumnos/alumno-detail/alumno-detail';
import { AlumnoEdit } from './pages/alumnos/alumno-edit/alumno-edit';
import { CursosList } from './pages/cursos/cursos-list/cursos-list';
import { CursoCreate } from './pages/cursos/curso-create/curso-create';
import { CursoDetail } from './pages/cursos/curso-detail/curso-detail';
import { InscripcionesList } from './pages/inscripciones/inscripciones-list/inscripciones-list';
import { InscripcionDetail } from './pages/inscripciones/inscripcion-detail/inscripcion-detail';
import { InscripcionCreate } from './pages/inscripciones/inscripcion-create/inscripcion-create';
import { PagosList } from './pages/pagos/pagos-list/pagos-list';
import { PagoDetail } from './pages/pagos/pago-detail/pago-detail';
import { PagoCreate } from './pages/pagos/pago-create/pago-create';
import { ProfesorasList } from './pages/profesoras/profesoras-list/profesoras-list';
import { ProfesoraDetail } from './pages/profesoras/profesora-detail/profesora-detail';
import { ProfesoraCreate } from './pages/profesoras/profesora-create/profesora-create';
import { CuotasList } from './pages/cuotas/cuotas-list/cuotas-list';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', component: Dashboard },
      { path: 'alumnos', component: AlumnosList },
      { path: 'alumnos/nueva', component: AlumnoCreate },
      { path: 'alumnos/:id', component: AlumnoDetail },
      { path: 'alumnos/:id/editar', component: AlumnoEdit },
      { path: 'cursos', component: CursosList },
      { path: 'cursos/nuevo', component: CursoCreate },
      { path: 'cursos/:id', component: CursoDetail },
      { path: 'inscripciones', component: InscripcionesList },
      { path: 'inscripciones/nueva', component: InscripcionCreate },
      { path: 'inscripciones/:id', component: InscripcionDetail },
      { path: 'cuotas/:cuotaId/pago', component: PagoCreate },
      { path: 'cuotas', component: CuotasList },
      { path: 'pagos', component: PagosList },
      { path: 'pagos/nuevo', component: PagoCreate },
      { path: 'pagos/:id', component: PagoDetail },
      { path: 'profesoras', component: ProfesorasList },
      { path: 'profesoras/nueva', component: ProfesoraCreate },
      { path: 'profesoras/:id', component: ProfesoraDetail }
    ]
  }
];
