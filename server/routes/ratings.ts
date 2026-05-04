import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index.js'

const XP_RATING = 50
const XP_PHOTO_BONUS = 30
const TASTE_RATING = 40
const TASTE_PHOTO_BONUS = 30

export default async function ratingsRoutes(app: FastifyInstance) {
  // POST /ratings/service
  app.post('/service', { preHandler: [app.authenticate] }, async (req, reply) => {
    const data = req.body as {
      staffId: string
      serviceCategory: string
      score: number
      review?: string
      images?: string[]
    }

    const { staffId, serviceCategory, score, review, images = [] } = data

    if (score < 1 || score > 5) return reply.status(400).send({ error: 'Score must be 1–5' })

    // Anti-abuse: 1 rating per client per staff per week
    const weekKey = `rating:${req.user.id}:${staffId}:${getWeekKey()}`
    const alreadyRated = await redis.get(weekKey)
    if (alreadyRated) return reply.status(429).send({ error: 'already_rated' })

    await redis.setex(weekKey, 604800, '1')

    const rating = await prisma.serviceRating.create({
      data: {
        clientId: req.user.id,
        staffId,
        serviceCategory,
        score,
        review,
        images,
      },
    })

    // Recompute staff avg and points
    const ratings = await prisma.serviceRating.findMany({ where: { staffId }, select: { score: true } })
    const avgRating = ratings.reduce((s, r) => s + r.score, 0) / ratings.length
    const xpEarned = XP_RATING + (images.length > 0 ? XP_PHOTO_BONUS : 0)

    await prisma.staffProfile.update({
      where: { id: staffId },
      data: {
        avgRating,
        reviewCount: ratings.length,
        totalPoints: { increment: xpEarned },
        weeklyPoints: { increment: xpEarned },
      },
    })

    // Client earns Taste Points
    const tasteEarned = TASTE_RATING + (images.length > 0 ? TASTE_PHOTO_BONUS : 0)
    await prisma.clientProfile.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, tastePoints: tasteEarned },
      update: { tastePoints: { increment: tasteEarned } },
    })

    // Update leaderboard in Redis
    const staff = await prisma.staffProfile.findUnique({
      where: { id: staffId },
      select: { totalPoints: true, subscriptionTier: true, city: true, specialties: true },
    })
    if (staff) {
      for (const spec of staff.specialties) {
        await redis.zadd(`lb:staff:${spec}:${staff.city.toLowerCase()}`, staff.totalPoints, staffId)
      }
      await redis.zadd(`lb:staff:all:${staff.city.toLowerCase()}`, staff.totalPoints, staffId)
    }

    return { rating, xpEarned, tasteEarned }
  })

  // POST /ratings/client
  app.post('/client', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STAFF') return reply.status(403).send({ error: 'Only staff can rate clients' })

    const { clientId, professionalism, punctuality, paymentReliability, notes } = req.body as {
      clientId: string
      professionalism: number
      punctuality: number
      paymentReliability: number
      notes?: string
    }

    const overallScore = (professionalism + punctuality + paymentReliability) / 3
    const rating = await prisma.clientRating.create({
      data: {
        staffId: req.user.id,
        clientId,
        professionalism,
        punctuality,
        paymentReliability,
        overallScore,
        notes,
      },
    })
    return { rating }
  })

  // GET /ratings/staff/:staffId
  app.get('/staff/:staffId', async (req) => {
    const { staffId } = req.params as { staffId: string }
    const { page = 1 } = req.query as { page?: number }
    const p = Number(page)
    const skip = (p - 1) * 20

    const [ratings, total] = await Promise.all([
      prisma.serviceRating.findMany({
        where: { staffId },
        skip,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.serviceRating.count({ where: { staffId } }),
    ])

    return { ratings, total, page: p, hasMore: skip + 20 < total }
  })
}

function getWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7)
  return `${year}W${week}`
}
