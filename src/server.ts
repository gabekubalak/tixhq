import pino from 'pino';
import { parseEnv } from './config/env.js';
import { createSeoAdapter } from './adapters/index.js';
import { buildApp } from './http/app.js';

const env = parseEnv();
const logger = pino({ level: env.LOG_LEVEL });
const seo = createSeoAdapter(env);
const app = buildApp({ seo, logger });

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'northvane-api listening');
});
