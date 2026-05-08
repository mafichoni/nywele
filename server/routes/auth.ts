import { createHmac } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { redis, supabaseAdmin } from '../index.js'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function derivePassword(phone: string): string {
  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me'
  return createHmac('sha256', secret).update(`otp-auth:${phone}`).digest('hex').slice(0, 32)
}

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/request-otp
  // Generates a 6-digit OTP, stores it in Redis (10 min TTL), and logs it.
  // Replaces Supabase's SMS flow so no external SMS provider is needed.
  app.post('/request-otp', async (req, reply) => {
    const { phone } = req.body as { phone?: string }
    if (!phone) return reply.status(400).send({ error: 'Phone required' })

    const otp = generateOtp()
    await redis.setex(`auth:otp:${phone}`, 600, otp)

    // Visible in Vercel Function logs → Runtime Logs tab
    console.log(`[AUTH] OTP for ${phone} → ${otp}`)

    return { sent: true }
  })

  // POST /auth/verify-otp
  // Validates the OTP, ensures the Supabase user exists (phone confirmed),
  // then signs in with phone+password and returns a real Supabase session.
  app.post('/verify-otp', async (req, reply) => {
    const { phone, otp } = req.body as { phone?: string; otp?: string }
    if (!phone || !otp) return reply.status(400).send({ error: 'Phone and OTP required' })

    const stored = await redis.get(`auth:otp:${phone}`)
    if (!stored || stored !== otp) {
      return reply.status(400).send({ error: 'Invalid or expired code' })
    }
    await redis.del(`auth:otp:${phone}`)

    const password = derivePassword(phone)

    // Upsert Supabase user with confirmed phone
    try {
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
    } catch (err) {
      console.error('[AUTH] Supabase user upsert error:', err)
      return reply.status(500).send({ error: 'Failed to provision user' })
    }

    // Sign in via phone + password — no SMS required
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ phone, password })
    if (error || !data.session) {
      console.error('[AUTH] Sign-in error:', error)
      return reply.status(500).send({ error: 'Failed to create session' })
    }

    const { access_token, refresh_token, expires_in, token_type, user } = data.session
    return { session: { access_token, refresh_token, expires_in, token_type, user } }
  })
}
