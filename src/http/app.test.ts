import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';
import { MockSeoAdapter } from '../adapters/mock/MockSeoAdapter.js';
import { SeoReportSchema } from '../domain/seo.js';

describe('app', () => {
  const app = buildApp({ seo: new MockSeoAdapter() });

  it('GET /healthz returns 200 with status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /clients/:id/seo-report returns a valid report for a uuid', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const res = await request(app).get(`/clients/${id}/seo-report`);
    expect(res.status).toBe(200);
    expect(res.body.clientId).toBe(id);
    expect(() => SeoReportSchema.parse(res.body)).not.toThrow();
  });

  it('GET /clients/:id/seo-report returns 400 for a non-uuid id', async () => {
    const res = await request(app).get('/clients/not-a-uuid/seo-report');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid client id');
    expect(res.body.code).toBe('validation_error');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not found', code: 'not_found' });
  });
});
