import type { Env } from '../config/env.js';
import type { SeoAdapter } from './SeoAdapter.js';
import { MockSeoAdapter } from './mock/MockSeoAdapter.js';

export function createSeoAdapter(env: Env): SeoAdapter {
  switch (env.ADAPTER_SEO) {
    case 'mock':
      return new MockSeoAdapter();
    case 'semrush':
      throw new Error('semrush adapter not yet implemented');
  }
}
