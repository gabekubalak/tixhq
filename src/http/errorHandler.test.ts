import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from './errorHandler.js';
import { NotFoundError, ValidationError } from '../errors.js';

function buildTestApp(handler: express.RequestHandler): express.Express {
  const app = express();
  app.get('/boom', handler);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('maps ValidationError to 400 with details', async () => {
    const app = buildTestApp((_req, _res, next) => {
      next(new ValidationError('bad input', [{ path: ['id'] }]));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'bad input',
      code: 'validation_error',
      details: [{ path: ['id'] }],
    });
  });

  it('maps NotFoundError to 404 without details', async () => {
    const app = buildTestApp((_req, _res, next) => {
      next(new NotFoundError('client not found'));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'client not found', code: 'not_found' });
  });

  it('maps unknown errors to 500 with generic message', async () => {
    const app = buildTestApp((_req, _res, next) => {
      next(new Error('kaboom'));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal server error', code: 'internal_error' });
  });
});

describe('notFoundHandler', () => {
  it('responds with 404 JSON for unmatched routes', async () => {
    const app = express();
    app.use(notFoundHandler);
    app.use(errorHandler);
    const res = await request(app).get('/missing');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not found', code: 'not_found' });
  });
});
