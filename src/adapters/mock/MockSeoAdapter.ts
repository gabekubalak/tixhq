import type { SeoAdapter } from '../SeoAdapter.js';
import type { SeoReport } from '../../domain/seo.js';

export class MockSeoAdapter implements SeoAdapter {
  async fetchReport(clientId: string): Promise<SeoReport> {
    return {
      clientId,
      generatedAt: new Date('2026-05-19T00:00:00.000Z'),
      organicTraffic: 12_500,
      rankings: [
        {
          keyword: 'best running shoes',
          position: 3,
          url: 'https://example.com/running-shoes',
          searchVolume: 40_500,
        },
        {
          keyword: 'trail running gear',
          position: 7,
          url: 'https://example.com/trail-gear',
          searchVolume: 8_100,
        },
        {
          keyword: 'marathon training plan',
          position: 12,
          url: 'https://example.com/marathon-plan',
          searchVolume: 2_900,
        },
      ],
    };
  }
}
