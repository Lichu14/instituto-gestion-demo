import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginLimiterService } from './login-limiter.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly loginLimiter: LoginLimiterService,
  ) {}

  async findUserByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.findUserByEmail(email);

    if (!user || !user.activo) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async login(email: string, password: string, ip: string) {
    const reservas = await this.loginLimiter.reservar(email, ip);
    const user = await this.validateUser(email, password);

    if (!user) {
      return null;
    }

    await this.loginLimiter.confirmarExito(reservas);

    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
    };
  }
}
