import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// ─── Clients ─────────────────────────────────────────────────────────────────
export const prisma = new PrismaClient()
export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// ─── Server ───────────────────────────────────────────────────────────────────
const app = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' } })

await app.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://nywele.app', 'https://www.nywele.app']
    : true,
  credentials: true,
})

await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' })

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers['x-forwarded-for'] as string ?? req.ip,
})

// ─── Auth middleware ──────────────────────────────────────────────────────────
app.decorate('authenticate', async function (req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing token' })
    }
    const token = authHeader.slice(7)
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      return reply.status(401).send({ error: 'Invalid token' })
    }
    req.supabaseUser = data.user
    const user = await prisma.user.findUnique({ where: { supabaseId: data.user.id } })
    if (!user) return reply.status(401).send({ error: 'User not found' })
    req.user = user
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
})

// ─── Routes ───────────────────────────────────────────────────────────────────
import userRoutes from './routes/users.js'
import staffRoutes from './routes/staff.js'
import feedRoutes from './routes/feed.js'
import ratingsRoutes from './routes/ratings.js'
import leaderboardRoutes from './routes/leaderboard.js'
import paymentsRoutes from './routes/payments.js'
import competitionsRoutes from './routes/competitions.js'
import marketplaceRoutes from './routes/marketplace.js'
import communityRoutes from './routes/community.js'
import adminRoutes from './routes/admin.js'

app.register(userRoutes, { prefix: '/v1/users' })
app.register(staffRoutes, { prefix: '/v1/staff' })
app.register(feedRoutes, { prefix: '/v1/feed' })
app.register(ratingsRoutes, { prefix: '/v1/ratings' })
app.register(leaderboardRoutes, { prefix: '/v1/leaderboard' })
app.register(paymentsRoutes, { prefix: '/v1/payments' })
app.register(competitionsRoutes, { prefix: '/v1/competitions' })
app.register(marketplaceRoutes, { prefix: '/v1/marketplace' })
app.register(communityRoutes, { prefix: '/v1/community' })
app.register(adminRoutes, { prefix: '/v1/admin' })

app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001)
await app.listen({ port: PORT, host: '0.0.0.0' })
console.log(`🚀 Nywele API running on port ${PORT}`)
