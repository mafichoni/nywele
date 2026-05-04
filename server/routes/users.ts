import type { FastifyInstance } from 'fastify'
import { prisma } from '../index.js'

export default async function userRoutes(app: FastifyInstance) {
  // GET /users/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const user = req.user
    const staffProfile = user.role === 'STAFF'
      ? await prisma.staffProfile.findUnique({
          where: { userId: user.id },
          include: {
            outlet: true,
            serviceMenuItems: true,
            portfolioImages: { take: 20, orderBy: { createdAt: 'desc' } },
          },
        })
      : null

    const clientProfile = user.role === 'CLIENT'
      ? await prisma.clientProfile.findUnique({ where: { userId: user.id } })
      : null

    return { user, staffProfile, clientProfile }
  })

  // POST /users/onboard
  app.post('/onboard', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { role, name } = req.body as { role: string; name?: string }
    const allowedRoles = ['CLIENT', 'STAFF', 'OUTLET_ADMIN']
    if (!allowedRoles.includes(role)) return reply.status(400).send({ error: 'Invalid role' })

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { role: role as 'CLIENT' | 'STAFF' | 'OUTLET_ADMIN', name: name ?? req.user.name },
    })

    if (role === 'STAFF') {
      await prisma.staffProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, city: 'Nairobi' },
        update: {},
      })
    } else if (role === 'CLIENT') {
      await prisma.clientProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id },
        update: {},
      })
    }

    return { user: updated }
  })

  // PATCH /users/me
  app.patch('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { name, avatar } = req.body as { name?: string; avatar?: string }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }), ...(avatar && { avatar }) },
    })
    return { user: updated }
  })
}
