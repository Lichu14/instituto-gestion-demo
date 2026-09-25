import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../dto/login.dto';
import type { Request, Response } from 'express';
import { loginClientIp } from './login-client-ip';
import {
  LOGIN_WINDOW_SECONDS,
  LoginLimitException,
} from './login-limiter.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let result: Awaited<ReturnType<AuthService['login']>>;
    try {
      result = await this.authService.login(
        loginDto.email,
        loginDto.password,
        loginClientIp(req),
      );
    } catch (error) {
      if (error instanceof LoginLimitException)
        res.setHeader('Retry-After', LOGIN_WINDOW_SECONDS);
      throw error;
    }

    if (!result) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return result;
  }
}
