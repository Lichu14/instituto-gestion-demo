import type { Request, Response, NextFunction } from 'express';

// Esta distribución pública es siempre de solo lectura: no depende de una variable de entorno.
export function demoReadonly(req: Request, res: Response, next: NextFunction) {
  const pathname = req.path.toLowerCase().replace(/\/+$/, '');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
      (req.method === 'POST' && pathname === '/api/auth/login')) {
    return next();
  }
  res.status(403).json({ statusCode: 403, message: 'La demo es de solo lectura. Los cambios no se guardan.', error: 'DemoReadOnly' });
}
