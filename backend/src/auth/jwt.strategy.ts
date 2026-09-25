import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<{
    userId: number;
    email: string;
    rol: string;
  }> {
    if (
      !Number.isInteger(payload.sub) ||
      payload.sub <= 0 ||
      payload.sub > 2147483647
    ) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, rol: true, activo: true },
    });
    if (!user?.activo) throw new UnauthorizedException();
    return {
      userId: user.id,
      email: user.email,
      rol: user.rol,
    };
  }
}
