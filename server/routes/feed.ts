import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index.js'

export default async function feedRoutes(app: FastifyInstance) {
  // GET /feed
  app.get('/', async (req) => {
    const {
      page = 1,
      pageSize = 20,
      q,
      specialty,
      city,
      freelance,
      mobileService,
      availableToday,
      featuredOnly,
    } = req.query as Record<string, string>

    const p = Number(page)
    const ps = Math.min(Number(pageSize), 50)
    const skip = (p - 1) * ps

    const where: Record<string, unknown> = {
      subscriptionTier: { not: 'NONE' },
    }

    if (specialty) where.specialties = { has: specialty }
    if (city) where.city = city
    if (freelance === 'true') where.freelance = true
    if (mobileService === 'true') where.mobileService = true
    if (availableToday === 'true') where.availableToday = true
    if (featuredOnly === 'true') where.subscriptionTier = 'FEATURED'

    const orderBy = [
      { subscriptionTier: 'desc' as const },
      { totalPoints: 'desc' as const },
    ]

    const [items, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        skip,
        take: ps,
        orderBy,
        include: {
          user: { select: { id: true, name: true, avatar: true, phone: true } },
          outlet: { select: { id: true, name: true } },
        },
      }),
      prisma.staffProfile.count({ where }),
    ])

    return {
      items,
      total,
      page: p,
      hasMore: skip + ps < total,
    }
  })
}
