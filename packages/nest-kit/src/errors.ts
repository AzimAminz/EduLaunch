import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { DomainError } from '@edulaunch/ddd';
import { ZodError } from 'zod';
import type { Response } from 'express';

const STATUS_BY_CODE: Record<string, number> = {
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  conflict: HttpStatus.CONFLICT,
};

/** Maps domain, validation and HTTP errors to `{ code, message }` without leaking internals. */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      res.status(STATUS_BY_CODE[exception.code] ?? HttpStatus.UNPROCESSABLE_ENTITY).json({ code: exception.code, message: exception.message });
      return;
    }
    if (exception instanceof ZodError) {
      res.status(HttpStatus.BAD_REQUEST).json({ code: 'invalid_input', message: exception.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      return;
    }
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json({ code: 'http_error', message: exception.message });
      return;
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ code: 'internal_error', message: 'Something went wrong' });
  }
}
