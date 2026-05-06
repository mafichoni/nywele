import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index.js'

export default async function staffRoutes(app: FastifyInstance) {
  // GET /staff/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const staff = await prisma.staffProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true, phone: true, createdAt: true } },
        outlet: true,
        serviceMenuItems: true,
        portfolioImages: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    })
    if (!staff) return reply.status(404).send({ error: 'Staff not found' })
    return { staff }
  })

  // PATCH /staff/:id
  app.patch('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const staff = await prisma.staffProfile.findUnique({ where: { id } })
    if (!staff || staff.userId !== req.user.id) return reply.status(403).send({ error: 'Forbidden' })

    const {
      bio, specialties, freelance, mobileService, mobileRadiusKm,
      city, availableForPlacement,
    } = req.body as Record<string, unknown>

    const updated = await prisma.staffProfile.update({
      where: { id },
      data: {
        ...(bio !== undefined && { bio: bio as string }),
        ...(specialties !== undefined && { specialties: specialties as string[] }),
        ...(freelance !== undefined && { freelance: Boolean(freelance) }),
        ...(mobileService !== undefined && { mobileService: Boolean(mobileService) }),
        ...(mobileRadiusKm !== undefined && { mobileRadiusKm: Number(mobileRadiusKm) }),
        ...(city !== undefined && { city: city as string }),
        ...(availableForPlacement !== undefined && { availableForPlacement: Boolean(availableForPlacement) }),
      },
    })
    return { staff: updated }
  })

  // POST /staff/:id/upvote
  app.post('/:id/upvote', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = req.user.id
    const key = `upvote:${userId}:${id}`
    const alreadyVoted = await redis.get(key)

    if (alreadyVoted) {
      // Remove upvote
      await redis.del(key)
      const staff = await prisma.staffProfile.update({
        where: { id },
        data: { upvoteCount: { decrement: 1 } },
      })
      await updateLeaderboardScore(id, staff)
      return { upvoted: false, upvoteCount: staff.upvoteCount }
    }

    // Add upvote — expires in 7 days (one per week)
    await redis.setex(key, 604800, '1')
    const staff = await prisma.staffProfile.update({
      where: { id },
      data: { upvoteCount: { increment: 1 }, totalPoints: { increment: 20 } },
    })
    await updateLeaderboardScore(id, staff)
    return { upvoted: true, upvoteCount: staff.upvoteCount }
  })

  // POST /staff/:id/availability
  app.post('/:id/availability', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const staff = await prisma.staffProfile.findUnique({ where: { id } })
    if (!staff || staff.userId !== req.user.id) return reply.status(403).send({ error: 'Forbidden' })
    const updated = await prisma.staffProfile.update({
      where: { id },
      data: { availableToday: !staff.availableToday },
    })
    return { availableToday: updated.availableToday }
  })

  // POST /staff/:id/placement-available
  app.post('/:id/placement-available', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const staff = await prisma.staffProfile.findUnique({ where: { id } })
    if (!staff || staff.userId !== req.user.id) return reply.status(403).send({ error: 'Forbidden' })
    const updated = await prisma.staffProfile.update({
      where: { id },
      data: { availableForPlacement: !staff.availableForPlacement },
    })
    return { availableForPlacement: updated.availableForPlacement }
  })

  // POST /staff/:id/menu-items
  app.post('/:id/menu-items', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const staff = await prisma.staffProfile.findUnique({ where: { id } })
    if (!staff || staff.userId !== req.user.id) return reply.status(403).send({ error: 'Forbidden' })

    const { category, name, description, priceMin, priceMax, durationMinutes } = req.body as {
      category: string; name: string; description?: string
      priceMin?: number; priceMax?: number; durationMinutes?: number
    }

    const item = await prisma.serviceMenuItem.create({
      data: {
        staffId: id,
        category,
        name,
        description,
        priceMin: priceMin ?? null,
        priceMax: priceMax ?? null,
        durationMinutes: durationMinutes ?? null,
      },
    })
    return { item }
  })

  // PATCH /staff/:id/menu-items/:itemId
  app.patch('/:id/menu-items/:itemId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, itemId } = req.params as { id: string; itemId: string }
    const staff = await prisma.staffProfile.findUnique({ where: { id } })
    if (!staff || staff.userId !== req.user.id) return reply.status(403).send({ error: 'Forbidden' })

    const { name, description, priceMin, priceMax, durationMinutes } = req.body as {
      name?: string; description?: string
      priceMin?: number; priceMax?: number; durationMinutes?: number
    }

    const item = await prisma.serviceMenuItem.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priceMin !== undefined && { priceMin }),
        ...(priceMax !== undefined && { priceMax }),
        ...(durationMinutes !== undefined && { durationMinutes }),
      },
    })
    return { item }
  })

  // DELETE /staff/:id/menu-items/:itemId
  app.delete('/:id/menu-items/:itemId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, itemId } = req.params as { id: string; itemId: string }
    const staff = await prisma.staffProfile.findUnique({ where: { id } })
    if (!staff || staff.userId !== req.user.id) return reply.status(403).send({ error: 'Forbidden' })

    await prisma.serviceMenuItem.delete({ where: { id: itemId } })
    return { success: true }
  })
}

async function updateLeaderboardScore(
  staffId: string,
  staff: { totalPoints: number; subscriptionTier: string; city: string; specialties: string[] }
) {
  const score = staff.totalPoints
  for (const spec of staff.specialties) {
    await redis.zadd(`lb:staff:${spec}:${staff.city.toLowerCase()}`, score, staffId)
    await redis.zadd(`lb:staff:all:${staff.city.toLowerCase()}`, score, staffId)
  }
  if (!staff.specialties.length) {
    await redis.zadd(`lb:staff:all:${staff.city.toLowerCase()}`, score, staffId)
  }
}
