import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sends a one-time code to a phone. Pick the implementation with OTP_PROVIDER:
 *   console  (default) – logs the code; the API also returns it outside production
 *   msg91    – MSG91 OTP API (needs DLT-registered template)  MSG91_AUTH_KEY, MSG91_TEMPLATE_ID
 *   2factor  – 2Factor.in OTP API (pre-approved template)      TWOFACTOR_API_KEY, TWOFACTOR_TEMPLATE (optional)
 */
export abstract class OtpSender {
  abstract send(phoneE164: string, code: string): Promise<void>;
}

@Injectable()
export class ConsoleOtpSender extends OtpSender {
  private readonly logger = new Logger('OTP');
  async send(phone: string, code: string): Promise<void> {
    this.logger.warn(`[OTP console] ${phone} → ${code}`);
  }
}

/** MSG91 Send OTP API: https://docs.msg91.com/reference/send-otp */
@Injectable()
export class Msg91OtpSender extends OtpSender {
  private readonly logger = new Logger('OTP/MSG91');
  constructor(private readonly config: ConfigService) {
    super();
  }
  async send(phone: string, code: string): Promise<void> {
    const authKey = this.config.getOrThrow<string>('MSG91_AUTH_KEY');
    const templateId = this.config.getOrThrow<string>('MSG91_TEMPLATE_ID');
    const mobile = phone.replace(/^\+/, ''); // MSG91 wants 91XXXXXXXXXX
    const res = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: authKey },
      body: JSON.stringify({ template_id: templateId, mobile, otp: code, otp_expiry: 10 }),
    });
    const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!res.ok || body.type === 'error') {
      this.logger.error(`MSG91 send failed: ${res.status} ${body.message ?? ''}`);
      throw new Error('Could not send the OTP right now. Please try again in a minute.');
    }
  }
}

/** 2Factor.in OTP API: https://2factor.in/API/V1 — sends via their approved "OTP1" template by default. */
@Injectable()
export class TwoFactorOtpSender extends OtpSender {
  private readonly logger = new Logger('OTP/2Factor');
  constructor(private readonly config: ConfigService) {
    super();
  }
  async send(phone: string, code: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('TWOFACTOR_API_KEY');
    const template = this.config.get<string>('TWOFACTOR_TEMPLATE') ?? 'OTP1';
    const mobile = phone.replace(/^\+91/, '');
    const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${mobile}/${code}/${encodeURIComponent(template)}`;
    const res = await fetch(url);
    const body = (await res.json().catch(() => ({}))) as { Status?: string; Details?: string };
    if (!res.ok || body.Status !== 'Success') {
      this.logger.error(`2Factor send failed: ${res.status} ${body.Details ?? ''}`);
      throw new Error('Could not send the OTP right now. Please try again in a minute.');
    }
  }
}

export function otpSenderFactory(config: ConfigService): OtpSender {
  const provider = (config.get<string>('OTP_PROVIDER') ?? 'console').toLowerCase();
  if (provider === 'msg91') return new Msg91OtpSender(config);
  if (provider === '2factor') return new TwoFactorOtpSender(config);
  if (provider !== 'console') {
    new Logger('OTP').warn(`Unknown OTP_PROVIDER "${provider}" — falling back to console.`);
  }
  return new ConsoleOtpSender();
}
