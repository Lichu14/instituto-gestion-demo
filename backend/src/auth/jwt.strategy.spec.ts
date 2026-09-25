import 'dotenv/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JWT: identidad vigente en la base', () => {
  const findUnique = jest.fn();
  const strategy = new JwtStrategy({
    usuario: { findUnique },
  } as unknown as PrismaService);
  beforeEach(() => findUnique.mockReset());
  it.each([null, { id: 1, activo: false }])(
    'rechaza usuario eliminado/inactivo',
    async (user) => {
      findUnique.mockResolvedValue(user);
      await expect(
        Promise.resolve().then(() =>
          strategy.validate({
            sub: 1,
            email: 'old@example.invalid',
            rol: 'ADMIN',
          }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );
  it('devuelve la identidad de DB aunque los claims estén desactualizados', async () => {
    findUnique.mockResolvedValue({
      id: 1,
      activo: true,
      email: 'current@example.invalid',
      rol: 'ADMIN',
    });
    expect(
      await strategy.validate({
        sub: 1,
        email: 'old@example.invalid',
        rol: 'OLD_ROLE',
      }),
    ).toEqual({
      userId: 1,
      email: 'current@example.invalid',
      rol: 'ADMIN',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, email: true, rol: true, activo: true },
    });
  });
  it.each([0, -1, 1.2, '1', null, 2147483648])(
    'rechaza sub inválido %s antes de consultar DB',
    async (sub) => {
      await expect(
        Promise.resolve().then(() =>
          strategy.validate({ sub: sub as number, email: '', rol: '' }),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(findUnique).not.toHaveBeenCalled();
    },
  );
});
