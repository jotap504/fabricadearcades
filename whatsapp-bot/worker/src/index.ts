import Fastify from 'fastify'
import { config } from './config.js'
import { logger } from './logger.js'
import { enqueueMessage } from './debounceService.js'
import { normalizeEvolutionWebhook } from './normalizeEvolution.js'
import { supabase } from './supabase.js'

const app = Fastify({ loggerInstance: logger })

app.get('/health', async () => ({ ok: true }))

app.get('/ready', async (_request, reply) => {
  const { error } = await supabase.from('chatbot_bot_settings').select('key').limit(1)
  if (error) return reply.code(503).send({ ok: false, supabase: error.message })
  return { ok: true }
})

app.post('/webhooks/evolution', async (request, reply) => {
  const secret = request.headers['x-webhook-secret']
  if (secret !== config.WEBHOOK_SECRET) {
    return reply.code(401).send({ ok: false })
  }

  const message = normalizeEvolutionWebhook(request.body)
  if (!message) return { ok: true, ignored: true }

  enqueueMessage(message)
  return { ok: true, queued: true }
})

app.listen({ port: config.PORT, host: '0.0.0.0' })
  .catch((error) => {
    logger.error(error, 'worker_start_failed')
    process.exit(1)
  })
