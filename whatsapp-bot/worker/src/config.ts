import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),
  LLM_PROVIDER: z.enum(['openrouter', 'deepseek']).default('openrouter'),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  LLM_MODEL: z.string().default('deepseek/deepseek-chat-v3.1'),
  LLM_FALLBACK_MODEL: z.string().default('deepseek/deepseek-chat-v3.1'),
  LLM_TEMPERATURE: z.coerce.number().default(0.1),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_APP_NAME: z.string().default('Fabrica de Arcades WhatsApp Bot'),
  EMBEDDING_PROVIDER: z.string().default('openai'),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  WEBHOOK_SECRET: z.string().min(12),
  ADMIN_PHONE: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  DEBOUNCE_MS: z.coerce.number().default(2500),
})

export const config = envSchema.parse(process.env)
