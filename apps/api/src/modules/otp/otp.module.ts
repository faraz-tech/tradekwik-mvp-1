import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { OtpController } from './otp.controller.js';
import { OtpSender, otpSenderFactory } from './otp-sender.js';
import { OtpService } from './otp.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' as JwtSignOptions['expiresIn'] },
      }),
    }),
  ],
  controllers: [OtpController],
  providers: [
    OtpService,
    { provide: OtpSender, inject: [ConfigService], useFactory: otpSenderFactory },
  ],
  exports: [OtpService],
})
export class OtpModule {}
