import type { SeoReport } from '../domain/seo.js';

export interface SeoAdapter {
  fetchReport(clientId: string): Promise<SeoReport>;
}
