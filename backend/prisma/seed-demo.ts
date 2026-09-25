import 'dotenv/config';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { snapshotPago } from '../src/pagos/pago-auditoria';

async function main() {
  const connection = process.env.DATABASE_URL;
  if (!connection || process.env.CONFIRM_DEMO_DATABASE !== 'instituto-gestion-demo')
    throw new Error('Confirmá la base exclusiva de la demo con CONFIRM_DEMO_DATABASE=instituto-gestion-demo.');
  const prisma = new PrismaClient({ adapter: new PrismaPg({connectionString: connection}) });
  try {
    // Nunca borrar, reemplazar ni mezclar datos existentes.
    const existing = await Promise.all([prisma.usuario.count(), prisma.alumno.count(), prisma.profesora.count(), prisma.curso.count()]);
    if (existing.some(Boolean)) throw new Error('La base no está vacía. El seed no modificó los datos.');
    const passwordHash = await bcrypt.hash('DemoAcademia2026!', 12);
    await prisma.$transaction(async tx => {
      const user = await tx.usuario.create({data:{nombre:'Administración Demo',email:'demo@example.invalid',passwordHash}});
      const names = [['Sofía','Luna'],['Mateo','Robles'],['Valentina','Ríos'],['Benjamín','Vega'],['Emma','Soler'],['Joaquín','Paz'],['Isabella','Costa'],['Lucas','Molina'],['Catalina','Bosque'],['Thiago','Reed'],['Martina','Lago'],['Nicolás','Campos'],['Olivia','Sierra'],['Tomás','Flores'],['Delfina','Alba'],['Santiago','Prado']];
      const year = new Date().getUTCFullYear();
      const currentMonth = new Date().getUTCMonth()+1;
      const date = (y:number,m:number,d:number,h=12)=>new Date(Date.UTC(y,m-1,d,h));
      const teachers = await Promise.all([['Clara','Norte'],['Lucía','Montes'],['Paula','Valle']].map(([nombre,apellido],i)=>tx.profesora.create({data:{nombre,apellido,dni:String(99000001+i),telefono:'0000000000',email:'docente'+(i+1)+'@example.invalid'}})));
      const courses = [] as {id:number,precioMensual:Prisma.Decimal}[];
      for(const [i,nombre] of ['Kids · Explorers','Teens · Elementary','Adults · Intermediate','Conversación · B2'].entries()) {
        courses.push(await tx.curso.create({data:{nombre,precioMensual:35000+i*5000,precioMatricula:20000,profesoraId:teachers[i%3].id,horarios:{create:[{diaSemana:i%2?'MARTES':'LUNES',horaInicio:i<2?'17:00':'19:00',horaFin:i<2?'18:30':'20:30'}]}}}));
      }
      for(const [i,[nombre,apellido]] of names.entries()) {
        const alumno=await tx.alumno.create({data:{nombre,apellido,dni:String(98000001+i),telefono:'0000000000',email:'alumno'+(i+1)+'@example.invalid',fechaNacimiento:date(2005+i%10,3+i%6,12),estado:i===15?'ARCHIVADO':'ACTIVO'}});
        const years = i<4 ? [year-2,year-1,year] : [year];
        for(const y of years) {
          const historical=y<year;
          const abandoned=y===year-2;
          const course=courses[i%courses.length];
          const discount=i%4===0?10:0;
          const inscripcion=await tx.inscripcion.create({data:{alumnoId:alumno.id,cursoId:course.id,año:y,fechaInscripcion:date(y,2,20),descuentoPorcentaje:discount,estado:abandoned?'ABANDONADA':historical?'COMPLETADA':'ACTIVA'}});
          const month=Math.max(3,Math.min(currentMonth,11));
          const periods=historical?[3,4,5]:[month-1,month,month+1];
          for(const [j,m] of [2,...periods].entries()) {
            const matricula=j===0;
            const monto=matricula?20000:Number(course.precioMensual)*(1-discount/100);
            const totalPaid=matricula||historical&&!abandoned||j===1&&i%3!==0?monto:j===2&&i%3===0?monto/2:0;
            const vencimiento=date(y,m,10,0);
            const estado=abandoned&&j>1?'ANULADA':totalPaid===monto?'PAGADA':vencimiento<new Date()?'VENCIDA':totalPaid?'PAGO_PARCIAL':'PENDIENTE';
            const cuota=await tx.cuota.create({data:{inscripcionId:inscripcion.id,periodo:y+'-'+String(m).padStart(2,'0'),concepto:matricula?'MATRICULA':'MENSUALIDAD',monto,fechaVencimiento:vencimiento,estado}});
            if(totalPaid && estado!=='ANULADA') {
              const fechaPago=date(y,m,7);
              const pago=await tx.pago.create({data:{cuotaId:cuota.id,monto:totalPaid,fechaPago,fechaRegistro:date(y,m,8,15),medio:i%2?'TRANSFERENCIA':'EFECTIVO',nombrePagador:'Familia '+apellido,usuarioRegistroId:user.id,observaciones:'Pago ficticio para demostración.'}});
              await tx.pagoEvento.create({data:{pagoId:pago.id,usuarioId:user.id,usuarioNombre:user.nombre,fecha:pago.fechaRegistro!,accion:'CREADO',nuevo:snapshotPago(pago)}});
            }
          }
        }
      }
    },{timeout:120000});
    console.log('Demo preparada: 16 alumnos, 3 docentes, 4 cursos, 24 inscripciones y sus cuotas y pagos ficticios.');
  } finally {await prisma.$disconnect();}
}
main().catch(()=>{console.error('No se completó el seed. Verificá la conexión, la confirmación y que la base esté vacía. No se imprimen credenciales.');process.exitCode=1;});
