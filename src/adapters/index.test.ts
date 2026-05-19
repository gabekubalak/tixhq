import { describe, it, expect } from 'vitest';
import { createSeoAdapter } from './index.js';
import { MockSeoAdapter } from './mock/MockSeoAdapter.js';

describe('createSeoAdapter', () => {
  it('returns a MockSeoAdapter when ADAPTER_SEO=mock', () => {
    const adapter = createSeoAdapter({ PORT: 3000, ADAPTER_SEO: 'mock', LOG_LEVEL: 'info' });
    expect(adapter).toBeInstanceOf(MockSeoAdapter);
  });

  it('throws for semrush until implemented', () => {
    expect(() =>
      createSeoAdapter({ PORT: 3000, ADAPTER_SEO: 'semrush', LOG_LEVEL: 'info' }),
    ).toThrow(/semrush/);
  });
});
