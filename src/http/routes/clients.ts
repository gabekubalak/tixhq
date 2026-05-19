import type { Express } from 'express';
import { z } from 'zod';
import type { ClientRepository } from '../../repositories/ClientRepository.js';
import { CreateClientInputSchema } from '../../domain/client.js';
import { NotFoundError, ValidationError } from '../../errors.js';

const IdParamsSchema = z.object({ id: z.string().uuid() });

export function registerClientRoutes(app: Express, clients: ClientRepository): void {
  app.get('/clients', (_req, res, next) => {
    clients
      .list()
      .then((all) => res.json({ clients: all }))
      .catch(next);
  });

  app.post('/clients', (req, res, next) => {
    const parsed = CreateClientInputSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new ValidationError('invalid client input', parsed.error.issues));
      return;
    }
    clients
      .create(parsed.data)
      .then((client) => res.status(201).json(client))
      .catch(next);
  });

  app.get('/clients/:id', (req, res, next) => {
    const parsed = IdParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      next(new ValidationError('invalid client id', parsed.error.issues));
      return;
    }
    clients
      .findById(parsed.data.id)
      .then((client) => {
        if (!client) {
          next(new NotFoundError('client not found'));
          return;
        }
        res.json(client);
      })
      .catch(next);
  });
}
