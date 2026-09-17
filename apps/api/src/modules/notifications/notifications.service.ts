import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Notification stub for v1.
 * - WhatsApp: logs the message. Swap the body of sendWhatsApp for an
 *   Interakt/AiSensy client later — callers do not change.
 * - Email: nodemailer with JSON transport in dev (logs the mail); swap the
 *   transport via env when a real SMTP/provider is configured.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly mailer: Transporter;

  constructor() {
    this.mailer = createTransport({ jsonTransport: true });
  }

  async sendWhatsApp(to: string, message: string): Promise<void> {
    this.logger.log(`[WhatsApp stub] to=${to}\n${message}`);
  }

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    try {
      const info = await this.mailer.sendMail({
        from: 'TradeKwik <no-reply@tradekwik.example>',
        to,
        subject,
        text,
      });
      this.logger.log(`[Email stub] to=${to} subject="${subject}" ${String(info.messageId ?? '')}`);
    } catch (error) {
      // Notifications must never break the request that triggered them.
      this.logger.error(`Email send failed: ${String(error)}`);
    }
  }
}
