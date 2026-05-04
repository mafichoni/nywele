import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index.js'

const CACHE_TTL = 30 // 30 seconds max stale

export default async function leaderboardRoutes(app: FastifyInstance) {
  // GET /leaderboard/staff
  app.get('/staff', async (req) => {
    const { specialty = 'all', city = 'nairobi', period = 'weekly', limit = 50 } = req.query as Record<string, string>

    const cacheKey = `lb:cache:staff:${specialty}:${city.toLowerCase()}:${period}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const redisKey = `lb:staff:${specialty}:${city.toLowerCase()}`
    const rawEntries = await redis.zrevrange(redisKey, 0, Number(limit) - 1, 'WITHSCORES')

    if (rawEntries.length === 0) {
      // Fall back to PostgreSQL
      const where: Record<string, unknown> = { city }
      if (specialty !== 'all') where.specialties = { has: specialty }

      const orderField = period === 'weekly' ? 'weeklyPoints' : 'totalPoints'
      const staff = await prisma.staffProfile.findMany({
        where,
        orderBy: { [orderField]: 'desc' },
        take: Number(limit),
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      })

      const entries = staff.map((s, i) => ({
        rank: i + 1,
        previousRank: null,
        staffId: s.id,
        name: s.user.name,
        avatar: s.user.avatar,
        specialty: s.specialties[0] ?? null,
        city: s.city,
        score: period === 'weekly' ? s.weeklyPoints : s.totalPoints,
        weeklyScore: s.weeklyPoints,
        badgeIds: s.badgeIds,
        subscriptionTier: s.subscriptionTier,
        change: 'same' as const,
      }))

      const result = { entries }
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
      return result
    }

    // Parse Redis sorted set
    const ids: string[] = []
    const scores: Record<string, number> = {}
    for (let i = 0; i < rawEntries.length; i += 2) {
      ids.push(rawEntries[i])
      scores[rawEntries[i]] = Number(rawEntries[i + 1])
    }

    const staff = await prisma.staffProfile.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })

    const staffById = Object.fromEntries(staff.map((s) => [s.id, s]))
    const entries = ids
      .filter((id) => staffById[id])
      .map((id, i) => {
        const s = staffById[id]
        return {
          rank: i + 1,
          previousRank: null,
          staffId: s.id,
          name: s.user.name,
          avatar: s.user.avatar,
          specialty: s.specialties[0] ?? null,
          city: s.city,
          score: scores[id] ?? 0,
          weeklyScore: s.weeklyPoints,
          badgeIds: s.badgeIds,
          subscriptionTier: s.subscriptionTier,
          change: 'same' as const,
        }
      })

    const result = { entries }
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
    return result
  })

  // GET /leaderboard/outlets
  app.get('/outlets', async (req) => {
    const { city = 'Nairobi', period = 'weekly', limit = 30 } = req.query as Record<string, string>

    const cacheKey = `lb:cache:outlets:${city.toLowerCase()}:${period}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const outlets = await prisma.outlet.findMany({
      where: { city },
      orderBy: { aggregatePoints: 'desc' },
      take: Number(limit),
    })

    const entries = outlets.map((o, i) => ({
      rank: i + 1,
      previousRank: null,
      outletId: o.id,
      name: o.name,
      avatar: o.logoImage,
      outletType: o.type,
      city: o.city,
      score: o.aggregatePoints,
      weeklyScore: 0,
      badgeIds: [],
      subscriptionTier: o.subscriptionTier,
      change: 'same' as const,
    }))

    const result = { entries }
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result))
    return result
  })
}
