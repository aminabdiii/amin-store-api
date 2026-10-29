import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  PipeTransform,
} from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { isTransactionConflict } from './prisma-errors';

export class PageQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export function pageResult<T>(data: T[], total: number, query: PageQuery) {
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
export function skip(query: PageQuery) {
  return (query.page - 1) * query.limit;
}
export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}
@Injectable()
export class EntityIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id) || id > 2147483647)
      fail(400, 'INVALID_ID', 'Identifier must be a positive 32-bit integer');
    return id;
  }
}
export interface ApiRequest extends Request {
  requestId: string;
  user?: { id: string; role: 'CUSTOMER' | 'ADMIN'; sessionId: string };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<ApiRequest>();
    const res = http.getResponse<Response>();
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message: string | string[] = 'An unexpected error occurred';
    if (error instanceof HttpException) {
      status = error.getStatus();
      const response = error.getResponse();
      if (typeof response === 'string') message = response;
      else {
        const body = response as { code?: string; message?: string | string[] };
        message = body.message ?? message;
        code = body.code ?? `HTTP_${status}`;
      }
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        status = 409;
        code = 'CONFLICT';
        message = 'A record with these unique fields already exists';
      } else if (error.code === 'P2025') {
        status = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
      } else if (error.code === 'P2003') {
        status = 409;
        code = 'REFERENCE_CONFLICT';
        message = 'Referenced record is invalid or in use';
      } else if (isTransactionConflict(error)) {
        status = 409;
        code = 'RETRY_TRANSACTION';
        message = 'Concurrent modification; please retry';
      }
    }
    if (status === 500)
      console.error(
        JSON.stringify({
          event: 'request_error',
          requestId: req.requestId,
          errorType: error instanceof Error ? error.name : 'Unknown',
        }),
      );
    res.status(status).json({ statusCode: status, code, message, requestId: req.requestId });
  }
}
@Injectable()
export class RequestLogger implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const req = context.switchToHttp().getRequest<ApiRequest>();
    return next.handle().pipe(
      tap({
        complete: () =>
          console.info(
            JSON.stringify({
              event: 'request',
              requestId: req.requestId,
              method: req.method,
              route: req.route?.path ?? 'unknown',
              durationMs: Date.now() - started,
            }),
          ),
      }),
    );
  }
}
