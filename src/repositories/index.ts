import type { ClientRepository } from './ClientRepository.js';
import { InMemoryClientRepository } from './inMemory/InMemoryClientRepository.js';

export function createClientRepository(): ClientRepository {
  return new InMemoryClientRepository();
}
