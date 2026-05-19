import type { Express } from 'express';
import { z } from 'zod';
import type { SeoAdapter } from '../../adapters/SeoAdapter.js';
import type { ClientRepository } from '../../repositories/ClientRepository.js';
import { NotFoundError, ValidationError } from '../../errors.js';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export function registerReportRoutes(
  app: Express,
  seo: SeoAdapter,
  clients: ClientRepository,
): void {
  app.get('/clients/:id/seo-report', (req, res, next) => {
    const parsed = ParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      next(new ValidationError('invalid client id', parsed.error.issues));
      return;
    }
    clients
      .findById(parsed.data.id)
      .then(async (client) => {
        if (!client) {
          next(new NotFoundError('client not found'));
          return;
        }
        const report = await seo.fetchReport(client.id);
        res.json(report);
      })
      .catch(next);
  });
}
