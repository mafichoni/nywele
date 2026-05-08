import { createHmac } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { redis, supabaseAdmin, prisma } from '../index.js'

const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE ?? '+254722811171'
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? '382914'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function derivePassword(phone: string): string {
  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me'
  return createHmac('sha256', secret).update(`otp-auth:${phone}`).digest('hex').slice(0, 32)
}

async function upsertSupabaseUser(phone: string): Promise<void> {
  const password = derivePassword(phone)
  const { data: existing } = await supabaseAdmin.auth.admin.getUserByPhone(phone)
  if (existing.user) {
    await supabaseAdmin.auth.admin.updateUserById(existing.user.id, {
      phone_confirm: true,
      password,
    })
  } else {
    await supabaseAdmin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      password,
    })
  }
}

async function createSession(phone: string) {
  const password = derivePassword(phone)
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ phone, password })
  if (error || !data.session) throw error ?? new Error('No session returned')
  return data.session
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/request-otp
  // Returns mode:'password' for the super admin phone (no OTP sent).
  // All other phones get a random OTP stored in Redis and logged.
  app.post('/request-otp', async (req, reply) => {
    const { phone } = req.body as { phone?: string }
    if (!phone) return reply.status(400).send({ error: 'Phone required' })

    if (phone === SUPER_ADMIN_PHONE) {
      return { sent: true, mode: 'password' }
    }

    const otp = generateOtp()
    await redis.setex(`auth:otp:${phone}`, 600, otp)
    console.log(`[AUTH] OTP for ${phone} → ${otp}`)
    return { sent: true, mode: 'otp' }
  })

  // POST /auth/verify-otp — regular users only
  app.post('/verify-otp', async (req, reply) => {
    const { phone, otp } = req.body as { phone?: string; otp?: string }
    if (!phone || !otp) return reply.status(400).send({ error: 'Phone and OTP required' })

    const stored = await redis.get(`auth:otp:${phone}`)
    if (!stored || stored !== otp) {
      return reply.status(400).send({ error: 'Invalid or expired code' })
    }
    await redis.del(`auth:otp:${phone}`)

    try {
      await upsertSupabaseUser(phone)
    } catch (err) {
      console.error('[AUTH] Supabase user upsert error:', err)
      return reply.status(500).send({ error: 'Failed to provision user' })
    }

    try {
      const session = await createSession(phone)
      const { access_token, refresh_token, expires_in, token_type, user } = session
      return { session: { access_token, refresh_token, expires_in, token_type, user } }
    } catch (err) {
      console.error('[AUTH] Sign-in error:', err)
      return reply.status(500).send({ error: 'Failed to create session' })
    }
  })

  // POST /auth/admin-login — super admin password login
  app.post('/admin-login', async (req, reply) => {
    const { phone, password } = req.body as { phone?: string; password?: string }

    if (!phone || !password) {
      return reply.status(400).send({ error: 'Phone and password required' })
    }
    if (phone !== SUPER_ADMIN_PHONE || password !== SUPER_ADMIN_PASSWORD) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    try {
      await upsertSupabaseUser(phone)
    } catch (err) {
      console.error('[AUTH] Admin upsert error:', err)
      return reply.status(500).send({ error: 'Failed to provision admin user' })
    }

    // Ensure the user has ADMIN role in our DB
    try {
      const { data: supaUser } = await supabaseAdmin.auth.admin.getUserByPhone(phone)
      if (supaUser.user) {
        await prisma.user.upsert({
          where: { supabaseId: supaUser.user.id },
          create: {
            supabaseId: supaUser.user.id,
            phone,
            name: 'Super Admin',
            role: 'ADMIN',
          },
          update: { role: 'ADMIN' },
        })
      }
    } catch (err) {
      console.error('[AUTH] Admin DB upsert error:', err)
    }

    try {
      const session = await createSession(phone)
      const { access_token, refresh_token, expires_in, token_type, user } = session
      return { session: { access_token, refresh_token, expires_in, token_type, user } }
    } catch (err) {
      console.error('[AUTH] Admin sign-in error:', err)
      return reply.status(500).send({ error: 'Failed to create session' })
    }
  })
}
