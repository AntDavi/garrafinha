export type ServiceErrorCode =
  | 'network'
  | 'timeout'
  | 'not_found'
  | 'invalid_response'
  | 'limit_exceeded'
  | 'service_unavailable'
  | 'not_configured'
  | 'invalid_input';

/** Erro tipado dos serviços. `message` é técnica; use `userMessage` na interface. */
export class ServiceError extends Error {
  override readonly name = 'ServiceError';

  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    readonly userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

export const isServiceError = (e: unknown, code?: ServiceErrorCode): e is ServiceError =>
  e instanceof ServiceError && (code === undefined || e.code === code);
