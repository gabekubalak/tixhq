import { describe, it, expect } from 'vitest';
import { InMemoryClientRepository } from './InMemoryClientRepository.js';
import { ClientSchema } from '../../domain/client.js';

describe('InMemoryClientRepository', () => {
  it('create assigns a uuid and timestamp and returns a client that passes ClientSchema', async () => {
    const repo = new InMemoryClientRepository();
    const client = await repo.create({ name: 'Acme', domain: 'https://acme.example.com' });
    expect(() => ClientSchema.parse(client)).not.toThrow();
    expect(client.name).toBe('Acme');
    expect(client.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(client.createdAt).toBeInstanceOf(Date);
  });

  it('findById returns the stored client', async () => {
    const repo = new InMemoryClientRepository();
    const created = await repo.create({ name: 'Acme', domain: 'https://acme.example.com' });
    const fetched = await repo.findById(created.id);
    expect(fetched).toEqual(created);
  });

  it('findById returns null when not found', async () => {
    const repo = new InMemoryClientRepository();
    const result = await repo.findById('11111111-1111-1111-1111-111111111111');
    expect(result).toBeNull();
  });

  it('list returns every created client', async () => {
    const repo = new InMemoryClientRepository();
    await repo.create({ name: 'A', domain: 'https://a.example.com' });
    await repo.create({ name: 'B', domain: 'https://b.example.com' });
    const all = await repo.list();
    expect(all).toHaveLength(2);
    expect(all.map((c) => c.name).sort()).toEqual(['A', 'B']);
  });

  it('create assigns distinct ids', async () => {
    const repo = new InMemoryClientRepository();
    const a = await repo.create({ name: 'A', domain: 'https://a.example.com' });
    const b = await repo.create({ name: 'B', domain: 'https://b.example.com' });
    expect(a.id).not.toBe(b.id);
  });
});
