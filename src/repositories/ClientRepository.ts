import type { Client, CreateClientInput } from '../domain/client.js';

export interface ClientRepository {
  list(): Promise<Client[]>;
  findById(id: string): Promise<Client | null>;
  create(input: CreateClientInput): Promise<Client>;
}
