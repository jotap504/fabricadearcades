import pino from 'pino'
import { config } from './config.js'

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'EVOLUTION_API_KEY',
    'LLM_API_KEY',
    'EMBEDDING_API_KEY',
    '*.authorization',
    '*.apikey',
  ],
})
