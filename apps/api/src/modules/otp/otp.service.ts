import { createHash, randomInt } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, count, desc, eq, gte, isNull } from 'drizzle-orm';
import type {
  OtpPurpose,
  SendOtpInput,
  SendOtpResponseDto,
  VerifyOtpInput,
  VerifyOtpResponseDto,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { otpCodes } from '../../db/schema.js';
import { OtpSender } from './otp-sender.js';

/**
 * Abuse limits. All overridable via env (see .env.example):
 *   OTP_CODE_TTL_MIN            minutes a code stays valid            (default 10)
 *   OTP_RESEND_AFTER_SEC        seconds between two sends to a number (default 60)
 *   OTP_MAX_SENDS_PER_DAY       codes per number per rolling 24 h     (default 2)
 *   OTP_MAX_ATTEMPTS            wrong guesses before the code dies    (default 3)
 *   OTP_MAX_SENDS_PER_IP_DAY    codes one IP may trigger per 24 h     (default 10)
 *   OTP_TOKEN_TTL_MIN           minutes the verified-phone token lives (default 15)
 */
interface OtpLimits {
  codeTtlSec: number;
  resendAfterSec: number;
  maxSendsPerDay: number;
  maxAttempts: number;
  maxSendsPerIpPerDay: number;
  tokenTtlSec: number;
}
const DAY_SEC = 24 * 60 * 60;

interface OtpTokenClaims {
  kind: 'otp';
  phone: string;
  purpose: OtpPurpose;
}

export function normalizePhone(phone: string): string {
  return phone.startsWith('+91') ? phone : `+91${phone}`;
}

@Injectable()
export class OtpService {
  private readonly secret: string;
  private readonly isProd: boolean;
  private readonly limits: OtpLimits;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly sender: OtpSender,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
    this.isProd = config.get<string>('NODE_ENV') === 'production';
    const num = (key: string, fallback: number) => {
      const raw = Number(config.get<string>(key));
      return Number.isFinite(raw) && raw > 0 ? raw : fallback;
    };
    this.limits = {
      codeTtlSec: num('OTP_CODE_TTL_MIN', 10) * 60,
      resendAfterSec: num('OTP_RESEND_AFTER_SEC', 60),
      maxSendsPerDay: num('OTP_MAX_SENDS_PER_DAY', 2),
      maxAttempts: num('OTP_MAX_ATTEMPTS', 3),
      maxSendsPerIpPerDay: num('OTP_MAX_SENDS_PER_IP_DAY', 10),
      tokenTtlSec: num('OTP_TOKEN_TTL_MIN', 15) * 60,
    };
  }

  private hash(phone: string, purpose: string, code: string): string {
    return createHash('sha256').update(`${this.secret}|${phone}|${purpose}|${code}`).digest('hex');
  }

  async send(input: SendOtpInput, requestIp: string | null = null): Promise<SendOtpResponseDto> {
    const phone = normalizePhone(input.phone);
    const { codeTtlSec, resendAfterSec, maxSendsPerDay, maxSendsPerIpPerDay } = this.limits;
    const dayAgo = new Date(Date.now() - DAY_SEC * 1000);

    // Per-number daily cap (counts every purpose: a number gets N codes a day, full stop).
    const recent = await this.db
      .select({ createdAt: otpCodes.createdAt })
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, dayAgo)))
      .orderBy(desc(otpCodes.createdAt));
    if (recent.length >= maxSendsPerDay) {
      const oldest = recent[recent.length - 1].createdAt.getTime();
      const hours = Math.max(1, Math.ceil((oldest + DAY_SEC * 1000 - Date.now()) / 3_600_000));
      throw new BadRequestException(
        `You have reached the daily limit of ${maxSendsPerDay} verification codes for this number. Try again in about ${hours} hour${hours === 1 ? '' : 's'}.`,
      );
    }
    const last = recent[0];
    if (last && Date.now() - last.createdAt.getTime() < resendAfterSec * 1000) {
      const wait = Math.ceil((resendAfterSec * 1000 - (Date.now() - last.createdAt.getTime())) / 1000);
      throw new BadRequestException(`Please wait ${wait} seconds before requesting another code.`);
    }

    // Per-IP daily cap: stops one device from triggering SMS to many different numbers.
    if (requestIp) {
      const [{ value: ipCount }] = await this.db
        .select({ value: count() })
        .from(otpCodes)
        .where(and(eq(otpCodes.requestIp, requestIp), gte(otpCodes.createdAt, dayAgo)));
      if (ipCount >= maxSendsPerIpPerDay) {
        throw new BadRequestException('Too many verification requests from this device today. Please try again tomorrow.');
      }
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    // invalidate earlier unconsumed codes for this phone+purpose
    await this.db
      .update(otpCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(otpCodes.phone, phone), eq(otpCodes.purpose, input.purpose), isNull(otpCodes.consumedAt)));
    await this.db.insert(otpCodes).values({
      phone,
      purpose: input.purpose,
      codeHash: this.hash(phone, input.purpose, code),
      requestIp,
      expiresAt: new Date(Date.now() + codeTtlSec * 1000),
    });

    try {
      await this.sender.send(phone, code);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Could not send the OTP.');
    }

    return {
      expiresIn: codeTtlSec,
      resendAfter: resendAfterSec,
      attemptsAllowed: this.limits.maxAttempts,
      sendsLeftToday: Math.max(0, maxSendsPerDay - recent.length - 1),
      ...(this.isProd ? {} : { devCode: code }),
    };
  }

  async verify(input: VerifyOtpInput): Promise<VerifyOtpResponseDto> {
    const phone = normalizePhone(input.phone);
    const [row] = await this.db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), eq(otpCodes.purpose, input.purpose), isNull(otpCodes.consumedAt)))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This code has expired. Please request a new one.');
    }
    const { maxAttempts, tokenTtlSec } = this.limits;
    if (row.attempts >= maxAttempts) {
      throw new BadRequestException('Too many wrong attempts. Please request a new code.');
    }
    if (row.codeHash !== this.hash(phone, input.purpose, input.code)) {
      const used = row.attempts + 1;
      await this.db
        .update(otpCodes)
        // burn the code after the last allowed wrong guess
        .set({ attempts: used, ...(used >= maxAttempts ? { consumedAt: new Date() } : {}) })
        .where(eq(otpCodes.id, row.id));
      const left = maxAttempts - used;
      throw new BadRequestException(
        left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect code. Please request a new one.',
      );
    }

    await this.db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
    const claims: OtpTokenClaims = { kind: 'otp', phone, purpose: input.purpose };
    const otpToken = this.jwt.sign(claims, { expiresIn: tokenTtlSec });
    return { otpToken, expiresAt: new Date(Date.now() + tokenTtlSec * 1000).toISOString() };
  }

  /** Registration endpoints call this: the token must match the phone being registered. */
  assertVerified(otpToken: string, phone: string, purpose: OtpPurpose): void {
    let claims: OtpTokenClaims;
    try {
      claims = this.jwt.verify<OtpTokenClaims>(otpToken);
    } catch {
      throw new UnauthorizedException('Phone verification expired. Please verify your number again.');
    }
    if (claims.kind !== 'otp' || claims.purpose !== purpose || claims.phone !== normalizePhone(phone)) {
      throw new UnauthorizedException('Phone verification does not match this number. Please verify again.');
    }
  }
}
