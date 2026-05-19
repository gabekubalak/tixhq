import type { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { SeoAdapter } from '../../adapters/SeoAdapter.js';
import { ValidationError } from '../../errors.js';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export function registerReportRoutes(app: Express, seo: SeoAdapter): void {
  app.get(
    '/clients/:id/seo-report',
    (req: Request, res: Response, next: NextFunction) => {
      const parsed = ParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        next(new ValidationError('invalid client id', parsed.error.issues));
        return;
      }
      seo
        .fetchReport(parsed.data.id)
        .then((report) => res.json(report))
        .catch(next);
    },
  );
}
