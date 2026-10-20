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
  { path: 'login', title: 'Explorar demo · Gestia Demo', component: Login },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', title: 'Inicio · Gestia Demo', component: Dashboard },
      { path: 'alumnos', title: 'Alumnos · Gestia Demo', component: AlumnosList },
      { path: 'alumnos/nueva', title: 'Crear alumno · Gestia Demo', component: AlumnoCreate },
      { path: 'alumnos/:id', title: 'Alumno · Gestia Demo', component: AlumnoDetail },
      { path: 'alumnos/:id/editar', title: 'Editar alumno · Gestia Demo', component: AlumnoEdit },
      { path: 'cursos', title: 'Cursos · Gestia Demo', component: CursosList },
      { path: 'cursos/nuevo', title: 'Crear curso · Gestia Demo', component: CursoCreate },
      { path: 'cursos/:id', title: 'Curso · Gestia Demo', component: CursoDetail },
      { path: 'inscripciones', title: 'Inscripciones · Gestia Demo', component: InscripcionesList },
      { path: 'inscripciones/nueva', title: 'Crear inscripción · Gestia Demo', component: InscripcionCreate },
      { path: 'inscripciones/:id', title: 'Inscripción · Gestia Demo', component: InscripcionDetail },
      { path: 'cuotas/:cuotaId/pago', title: 'Registrar pago · Gestia Demo', component: PagoCreate },
      { path: 'cuotas', title: 'Cuotas · Gestia Demo', component: CuotasList },
      { path: 'pagos', title: 'Pagos · Gestia Demo', component: PagosList },
      { path: 'pagos/nuevo', title: 'Registrar pago · Gestia Demo', component: PagoCreate },
      { path: 'pagos/:id', title: 'Pago · Gestia Demo', component: PagoDetail },
      { path: 'profesoras', title: 'Profesoras · Gestia Demo', component: ProfesorasList },
      { path: 'profesoras/nueva', title: 'Crear profesora · Gestia Demo', component: ProfesoraCreate },
      { path: 'profesoras/:id', title: 'Profesora · Gestia Demo', component: ProfesoraDetail }
    ]
  }
];
