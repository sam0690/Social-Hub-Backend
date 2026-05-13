import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { AuthRepository } from '../repositories/auth.repository';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ── Helpers ────────────────────────────────────────────
  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('auth.jwtAccessSecret'),
      expiresIn: this.config.getOrThrow<string>(
        'auth.jwtAccessExpiresIn',
      ) as SignOptions['expiresIn'],
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('auth.jwtRefreshSecret'),
      expiresIn: this.config.getOrThrow<string>(
        'auth.jwtRefreshExpiresIn',
      ) as SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ── Register ───────────────────────────────────────────
  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.authRepository.findUserByEmail(dto.email),
      this.authRepository.findUserByUsername(dto.username),
    ]);

    if (existingEmail) throw new ConflictException('Email already in use');
    if (existingUsername) throw new ConflictException('Username already taken');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.authRepository.createUser({
      username: dto.username,
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      ipAddress,
      userAgent,
      expiresAt: refreshExpiresAt,
    });

    const { passwordHash: userPasswordHash, ...userWithoutPassword } = user;
    void userPasswordHash;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  // ── Login ──────────────────────────────────────────────
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'BANNED')
      throw new UnauthorizedException('Account banned');

    if (!user.passwordHash)
      throw new UnauthorizedException('Please use OAuth to login');

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = this.generateTokens(payload);

    await this.authRepository.revokeAllUserSessions(user.id);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      ipAddress,
      userAgent,
      expiresAt: refreshExpiresAt,
    });

    const { passwordHash: userPasswordHash, ...userWithoutPassword } = user;
    void userPasswordHash;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  // ── Refresh tokens ─────────────────────────────────────
  async refreshTokens(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedException();

    const session = await this.authRepository.findSessionByUserId(userId);
    if (!session) throw new UnauthorizedException('Session not found');

    const tokenHash = this.hashToken(refreshToken);
    if (session.refreshTokenHash !== tokenHash)
      throw new UnauthorizedException('Invalid refresh token');

    if (new Date() > session.expiresAt)
      throw new UnauthorizedException('Session expired');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const tokens = this.generateTokens(payload);

    await this.authRepository.revokeSession(session.id);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashToken(tokens.refreshToken),
      ipAddress,
      userAgent,
      expiresAt: refreshExpiresAt,
    });

    return tokens;
  }

  // ── Logout ─────────────────────────────────────────────
  async logout(userId: string) {
    await this.authRepository.revokeAllUserSessions(userId);
    return { message: 'Logged out successfully' };
  }

  // ── Forgot password ────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.authRepository.findUserByEmail(email);

    // always return success to prevent email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link was sent' };
    }

    const token = this.generateSecureToken();
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.authRepository.createPasswordReset({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // TODO: send email with token in Phase 2 when we add mail queue
    console.log(`Password reset token for ${email}: ${token}`);

    return { message: 'If that email exists, a reset link was sent' };
  }

  // ── Reset password ─────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const reset = await this.authRepository.findPasswordReset(tokenHash);

    if (!reset) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(newPassword);

    await Promise.all([
      this.authRepository.updateUser(reset.userId, { passwordHash }),
      this.authRepository.markPasswordResetUsed(reset.id),
      this.authRepository.revokeAllUserSessions(reset.userId),
    ]);

    return { message: 'Password reset successfully' };
  }

  // ── Get current user ───────────────────────────────────
  async getMe(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: userPasswordHash, ...userWithoutPassword } = user;
    void userPasswordHash;
    return userWithoutPassword;
  }
}
