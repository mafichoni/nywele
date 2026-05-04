import '@fastify/jwt'
import type { User } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    user: User
    supabaseUser: { id: string; phone?: string; email?: string }
  }
}
