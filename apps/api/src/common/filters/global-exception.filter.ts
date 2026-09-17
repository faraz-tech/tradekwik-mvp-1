import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import type { Response } from 'express';
import type { ApiError } from '@tradekwik/shared';

/**
 * Maps every error to the API error shape: { statusCode, message, errors? }.
 * User-facing messages stay plain-language; details are logged server-side.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiError {
    if (exception instanceof ZodValidationException) {
      const { fieldErrors } = z.flattenError(exception.getZodError() as z.ZodError);
      const errors: Record<string, string[]> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (messages) errors[field] = messages as string[];
      }
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Please check the highlighted fields and try again.',
        errors,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      let message = exception.message;
      if (typeof raw === 'string') {
        message = raw;
      } else if (typeof raw === 'object' && raw !== null && 'message' in raw) {
        const inner = (raw as { message: string | string[] }).message;
        message = Array.isArray(inner) ? inner.join('; ') : inner;
      }
      return { statusCode: status, message };
    }

    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong on our side. Please try again.',
    };
  }
}
