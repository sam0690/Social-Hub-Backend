import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import type { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import {
  ApiAuthEndpoint,
  ApiPublicEndpoint,
} from '../../../common/decorators/swagger.decorators.js';

type AuthRequest<TUser = { id: string }> = Request & {
  user: TUser;
};

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiPublicEndpoint('Register a new user', {
    created: 'User registered successfully',
    conflict: 'Email or username already taken',
  })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip, req.headers['user-agent']);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint('Login with email and password', {
    ok: 'Login successful',
    badRequest: 'Invalid credentials',
  })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers['user-agent']);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiAuthEndpoint('Refresh access token', { ok: 'Tokens refreshed' })
  async refresh(
    @Req() req: AuthRequest<JwtRefreshPayload & { refreshToken: string }>,
  ) {
    return this.authService.refreshTokens(
      req.user.sub,
      req.user.refreshToken,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint('Logout and revoke session', {
    ok: 'Logged out successfully',
  })
  async logout(@Req() req: AuthRequest) {
    return this.authService.logout(req.user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint('Request a password reset link', {
    ok: 'Reset link sent if email exists',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiPublicEndpoint('Reset password using token', {
    ok: 'Password reset successfully',
    badRequest: 'Invalid or expired token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiAuthEndpoint('Get current authenticated user', {
    ok: 'Current user data',
  })
  async getMe(@Req() req: AuthRequest) {
    return this.authService.getMe(req.user.id);
  }
}
