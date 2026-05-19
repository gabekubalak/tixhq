import { describe, it, expect, beforeEach } from 'vitest';
import type { Express } from 'express';
import request from 'supertest';
import { buildApp } from './app.js';
import { MockSeoAdapter } from '../adapters/mock/MockSeoAdapter.js';
import { InMemoryClientRepository } from '../repositories/inMemory/InMemoryClientRepository.js';
import { SeoReportSchema } from '../domain/seo.js';

describe('app', () => {
  let app: Express;
  let clients: InMemoryClientRepository;

  beforeEach(() => {
    clients = new InMemoryClientRepository();
    app = buildApp({ seo: new MockSeoAdapter(), clients });
  });

  it('GET /healthz returns 200 with status ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /clients creates a client and GET /clients lists it', async () => {
    const create = await request(app)
      .post('/clients')
      .send({ name: 'Acme', domain: 'https://acme.example.com' });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe('Acme');
    expect(typeof create.body.id).toBe('string');

    const list = await request(app).get('/clients');
    expect(list.status).toBe(200);
    expect(list.body.clients).toHaveLength(1);
    expect(list.body.clients[0].id).toBe(create.body.id);
  });

  it('POST /clients returns 400 when input is invalid', async () => {
    const res = await request(app)
      .post('/clients')
      .send({ name: '', domain: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
  });

  it('GET /clients/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/clients/11111111-1111-1111-1111-111111111111');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'client not found', code: 'not_found' });
  });

  it('GET /clients/:id/seo-report returns a valid report for a known client', async () => {
    const created = await clients.create({
      name: 'Acme',
      domain: 'https://acme.example.com',
    });
    const res = await request(app).get(`/clients/${created.id}/seo-report`);
    expect(res.status).toBe(200);
    expect(res.body.clientId).toBe(created.id);
    expect(() => SeoReportSchema.parse(res.body)).not.toThrow();
  });

  it('GET /clients/:id/seo-report returns 404 for an unknown client', async () => {
    const res = await request(app).get(
      '/clients/11111111-1111-1111-1111-111111111111/seo-report',
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
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
