import { randomUUID } from 'node:crypto';
import type { ClientRepository } from '../ClientRepository.js';
import type { Client, CreateClientInput } from '../../domain/client.js';

export class InMemoryClientRepository implements ClientRepository {
  private readonly store = new Map<string, Client>();

  async list(): Promise<Client[]> {
    return [...this.store.values()];
  }

  async findById(id: string): Promise<Client | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: CreateClientInput): Promise<Client> {
    const client: Client = {
      id: randomUUID(),
      ...input,
      createdAt: new Date(),
    };
    this.store.set(client.id, client);
    return client;
  }
}
