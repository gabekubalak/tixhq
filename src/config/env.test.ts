import { describe, it, expect } from 'vitest';
import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('returns defaults when env is empty', () => {
    const env = parseEnv({});
    expect(env.PORT).toBe(3000);
    expect(env.ADAPTER_SEO).toBe('mock');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('parses PORT as number', () => {
    const env = parseEnv({ PORT: '4000' });
    expect(env.PORT).toBe(4000);
  });

  it('accepts valid ADAPTER_SEO values', () => {
    expect(parseEnv({ ADAPTER_SEO: 'mock' }).ADAPTER_SEO).toBe('mock');
    expect(parseEnv({ ADAPTER_SEO: 'semrush' }).ADAPTER_SEO).toBe('semrush');
  });

  it('throws on invalid ADAPTER_SEO', () => {
    expect(() => parseEnv({ ADAPTER_SEO: 'invalid' })).toThrow();
  });

  it('throws on non-numeric PORT', () => {
    expect(() => parseEnv({ PORT: 'not-a-number' })).toThrow();
  });
});
