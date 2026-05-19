import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError } from './errors.js';

describe('errors', () => {
  it('ValidationError carries status 400, code, message, and details', () => {
    const err = new ValidationError('bad input', { field: 'id' });
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_error');
    expect(err.message).toBe('bad input');
    expect(err.details).toEqual({ field: 'id' });
  });

  it('NotFoundError carries status 404 and code', () => {
    const err = new NotFoundError('missing');
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
    expect(err.message).toBe('missing');
  });

  it('ValidationError omits details when not provided', () => {
    const err = new ValidationError('bad');
    expect(err.details).toBeUndefined();
  });
});
