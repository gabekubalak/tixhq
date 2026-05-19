import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import type { SeoAdapter } from '../adapters/SeoAdapter.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerReportRoutes } from './routes/reports.js';
import { errorHandler, notFoundHandler } from './errorHandler.js';

export interface AppDeps {
  seo: SeoAdapter;
  logger?: Logger;
}

export function buildApp(deps: AppDeps): Express {
  const app = express();
  if (deps.logger) {
    app.use(pinoHttp({ logger: deps.logger }));
  }
  app.use(express.json());
  registerHealthRoutes(app);
  registerReportRoutes(app, deps.seo);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
