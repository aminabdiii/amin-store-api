import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { hash, verify } from 'argon2';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '../common/database.service';
import { configuration } from '../common/config';
import { fail } from '../common/http';
import { presentUser, userSelect } from '../common/presenters';
import { LoginDto, RegisterDto, PasswordDto } from './auth.dto';
import { Prisma } from '@prisma/client';
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
@Injectable()
export class AuthService {
  private readonly dummy = hash(randomBytes(32).toString('hex'));
  constructor(private readonly db: Database) {}
  private async matches(encoded: string, password: string): Promise<boolean> {
    try {
      return encoded.startsWith('$2')
        ? await compare(password, encoded)
        : await verify(encoded, password);
    } catch {
      return false;
    }
  }
  private async issue(
    tx: Prisma.TransactionClient,
    userId: string,
    familyId: string = randomUUID(),
  ) {
    const refreshToken = randomBytes(32).toString('base64url');
    const session = await tx.session.create({
      data: {
        userId,
        familyId,
        tokenHash: tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    return {
      accessToken: jwt.sign({ sid: session.id }, configuration().jwtSecret, {
        subject: userId,
        expiresIn: '15m',
        algorithm: 'HS256',
        audience: 'amin-store-api',
        issuer: 'amin-store-api',
      }),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }
  async register(dto: RegisterDto) {
    const passwordHash = await hash(dto.password);
    return this.db.transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          username: dto.username.toLowerCase(),
          fullName: dto.fullName.trim(),
          passwordHash,
          cart: { create: {} },
        },
        select: userSelect,
      });
      return { ...(await this.issue(tx, user.id)), user: presentUser(user) };
    });
  }
  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    const valid = await this.matches(user?.passwordHash ?? (await this.dummy), dto.password);
    if (!user || !valid || !user.active)
      fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const upgraded = user.passwordHash.startsWith('$2') ? await hash(dto.password) : null;
    return this.db.transaction(async (tx) => {
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!current.active || current.passwordHash !== user.passwordHash)
        fail(401, 'INVALID_CREDENTIALS', 'Account changed; sign in again');
      if (upgraded)
        await tx.user.update({ where: { id: user.id }, data: { passwordHash: upgraded } });
      await tx.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
      return {
        ...(await this.issue(tx, user.id)),
        user: presentUser(
          await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect }),
        ),
      };
    });
  }
  async refresh(token: string) {
    const result = await this.db.transaction(async (tx) => {
      const original = await tx.session.findUnique({ where: { tokenHash: tokenHash(token) } });
      if (!original) return null;
      await tx.$queryRaw`SELECT id FROM "Session" WHERE "familyId"=${original.familyId}::uuid ORDER BY id FOR UPDATE`;
      const session = await tx.session.findUniqueOrThrow({
        where: { id: original.id },
        include: { user: true },
      });
      if (session.revokedAt || session.expiresAt <= new Date() || !session.user.active) {
        await tx.session.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      return this.issue(tx, session.userId, session.familyId);
    });
    if (!result) fail(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid, expired, or reused');
    return result;
  }
  async logout(sessionId: string) {
    await this.db.transaction(async (tx) => {
      const session = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
      await tx.$queryRaw`SELECT id FROM "Session" WHERE "familyId"=${session.familyId}::uuid ORDER BY id FOR UPDATE`;
      await tx.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { success: true };
  }
  async password(userId: string, dto: PasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.matches(user.passwordHash, dto.currentPassword)))
      fail(401, 'INVALID_PASSWORD', 'Current password is incorrect');
    const passwordHash = await hash(dto.password);
    await this.db.transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: userId, passwordHash: user.passwordHash, active: true },
        data: { passwordHash },
      });
      if (!changed.count) fail(409, 'ACCOUNT_CHANGED', 'Account changed; sign in again');
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { success: true };
  }
}
