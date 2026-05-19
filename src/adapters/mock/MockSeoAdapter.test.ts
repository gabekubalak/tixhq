import { describe, it, expect } from 'vitest';
import { MockSeoAdapter } from './MockSeoAdapter.js';
import { SeoReportSchema } from '../../domain/seo.js';

describe('MockSeoAdapter', () => {
  it('returns a report that satisfies SeoReportSchema', async () => {
    const adapter = new MockSeoAdapter();
    const report = await adapter.fetchReport('11111111-1111-1111-1111-111111111111');
    expect(() => SeoReportSchema.parse(report)).not.toThrow();
  });

  it('echoes the clientId into the report', async () => {
    const adapter = new MockSeoAdapter();
    const id = '22222222-2222-2222-2222-222222222222';
    const report = await adapter.fetchReport(id);
    expect(report.clientId).toBe(id);
  });

  it('returns at least one ranking', async () => {
    const adapter = new MockSeoAdapter();
    const report = await adapter.fetchReport('33333333-3333-3333-3333-333333333333');
    expect(report.rankings.length).toBeGreaterThan(0);
  });
});
