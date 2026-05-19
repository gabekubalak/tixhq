export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  readonly details?: unknown;
}

export class ValidationError extends AppError {
  readonly status = 400;
  readonly code = 'validation_error';
  override readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'not_found';
}
