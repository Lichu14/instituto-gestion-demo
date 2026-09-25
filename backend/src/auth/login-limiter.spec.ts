import { ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { LoginLimiterService } from './login-limiter.service';
import { PrismaService } from '../prisma/prisma.service';

it('no permite validar credenciales ni emitir JWT si falla el almacén compartido', async () => {
  const findUnique = jest.fn();
  const prisma = {
    usuario: { findUnique },
    $transaction: jest.fn().mockRejectedValue(new Error('Store unavailable')),
  } as unknown as PrismaService;
  const signAsync = jest.fn();
  const service = new AuthService(
    prisma,
    { signAsync } as unknown as JwtService,
    new LoginLimiterService(prisma),
  );
  await expect(
    service.login('test@example.invalid', 'test-only-password', '127.0.0.1'),
  ).rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(findUnique).not.toHaveBeenCalled();
  expect(signAsync).not.toHaveBeenCalled();
});
