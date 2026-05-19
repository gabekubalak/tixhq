import type { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { SeoAdapter } from '../../adapters/SeoAdapter.js';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export function registerReportRoutes(app: Express, seo: SeoAdapter): void {
  app.get(
    '/clients/:id/seo-report',
    async (req: Request, res: Response, next: NextFunction) => {
      const parsed = ParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({ error: 'invalid client id', issues: parsed.error.issues });
        return;
      }
      try {
        const report = await seo.fetchReport(parsed.data.id);
        res.json(report);
      } catch (err) {
        next(err);
      }
    },
  );
}
