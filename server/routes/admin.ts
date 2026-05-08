import type { FastifyInstance } from 'fastify'
import { prisma } from '../index.js'

export default async function adminRoutes(app: FastifyInstance) {
  // All admin routes require ADMIN role
  app.addHook('preHandler', async (req, reply) => {
    await app.authenticate(req, reply)
    if (req.user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
  })

  // ─── Stats ──────────────────────────────────────────────────────────────────

  app.get('/stats', async () => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekStart = new Date(now.getTime() - 7 * 86400000)

    const [
      totalUsers, totalStaff, totalClients, activeSubscriptions,
      totalRatings, pendingModeration, competitionsActive, mrr,
      newUsersThisWeek, totalOrders, totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.staffProfile.count(),
      prisma.clientProfile.count(),
      prisma.staffProfile.count({ where: { subscriptionTier: { not: 'NONE' } } }),
      prisma.serviceRating.count(),
      prisma.staffProfile.count({ where: { verified: false } }),
      prisma.competition.count({ where: { status: { in: ['entry_open', 'voting'] } } }),
      prisma.paymentLog.aggregate({
        where: { status: 'success', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.order.count(),
      prisma.paymentLog.aggregate({
        where: { status: 'success' },
        _sum: { amount: true },
      }),
    ])

    return {
      totalUsers, totalStaff, totalClients, activeSubscriptions,
      totalRatings, pendingModeration, competitionsActive,
      mrr: mrr._sum.amount ?? 0,
      newUsersThisWeek,
      totalOrders,
      totalRevenue: totalRevenue._sum.amount ?? 0,
    }
  })

  // ─── Users ──────────────────────────────────────────────────────────────────

  app.get('/users', async (req) => {
    const { page = 1, q, role } = req.query as { page?: number; q?: string; role?: string }
    const p = Number(page)
    const skip = (p - 1) * 25

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: {
          staffProfile: { select: { id: true, subscriptionTier: true, totalPoints: true, verified: true } },
          clientProfile: { select: { tastePoints: true, tasteTier: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, page: p, hasMore: skip + 25 < total }
  })

  app.patch('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { role, name } = req.body as { role?: string; name?: string }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role: role as 'CLIENT' | 'STAFF' | 'OUTLET_ADMIN' | 'SELLER' | 'ADMIN' }),
        ...(name && { name }),
      },
    })
    return { user }
  })

  app.delete('/users/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.user.delete({ where: { id } })
    return { success: true }
  })

  // ─── Staff ──────────────────────────────────────────────────────────────────

  app.get('/staff', async (req) => {
    const { page = 1, q, city, tier } = req.query as {
      page?: number; q?: string; city?: string; tier?: string
    }
    const p = Number(page)
    const skip = (p - 1) * 25

    const where: Record<string, unknown> = {}
    if (city) where.city = city
    if (tier) where.subscriptionTier = tier
    if (q) {
      where.user = { name: { contains: q, mode: 'insensitive' } }
    }

    const [staff, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        skip,
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true, avatar: true } },
        },
      }),
      prisma.staffProfile.count({ where }),
    ])

    return { staff, total, page: p, hasMore: skip + 25 < total }
  })

  app.patch('/staff/:id/subscription', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { tier, validUntil } = req.body as { tier: string; validUntil?: string }

    const staff = await prisma.staffProfile.update({
      where: { id },
      data: {
        subscriptionTier: tier as 'NONE' | 'BASIC' | 'FEATURED',
        subscriptionValidUntil: validUntil ? new Date(validUntil) : null,
      },
    })
    return { staff }
  })

  app.post('/staff/:id/badge', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { badge } = req.body as { badge: string }

    const current = await prisma.staffProfile.findUnique({ where: { id }, select: { badgeIds: true } })
    if (!current) return reply.status(404).send({ error: 'Staff not found' })

    if (!current.badgeIds.includes(badge)) {
      await prisma.staffProfile.update({
        where: { id },
        data: { badgeIds: { push: badge } },
      })
    }
    return { success: true }
  })

  app.delete('/staff/:id/badge/:badge', async (req, reply) => {
    const { id, badge } = req.params as { id: string; badge: string }
    const current = await prisma.staffProfile.findUnique({ where: { id }, select: { badgeIds: true } })
    if (!current) return reply.status(404).send({ error: 'Staff not found' })

    await prisma.staffProfile.update({
      where: { id },
      data: { badgeIds: current.badgeIds.filter((b) => b !== badge) },
    })
    return { success: true }
  })

  app.patch('/staff/:id/verify', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { verified } = req.body as { verified: boolean }
    const staff = await prisma.staffProfile.update({
      where: { id },
      data: { verified },
    })
    return { staff }
  })

  // ─── Competitions ────────────────────────────────────────────────────────────

  app.get('/competitions', async (req) => {
    const { page = 1 } = req.query as { page?: number }
    const p = Number(page)
    const skip = (p - 1) * 20

    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        skip, take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { entries: true } },
        },
      }),
      prisma.competition.count(),
    ])

    return { competitions, total, page: p, hasMore: skip + 20 < total }
  })

  app.post('/competitions', async (req, reply) => {
    const body = req.body as {
      title: string; description: string; category: string
      entryFeeKes: number; prizePool: number
      entryOpenDate: string; entryCloseDate: string
      votingOpenDate: string; votingCloseDate: string
      coverImage?: string
    }

    const competition = await prisma.competition.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        entryFeeKes: body.entryFeeKes,
        prizePool: body.prizePool,
        entryOpenDate: new Date(body.entryOpenDate),
        entryCloseDate: new Date(body.entryCloseDate),
        votingOpenDate: new Date(body.votingOpenDate),
        votingCloseDate: new Date(body.votingCloseDate),
        coverImage: body.coverImage ?? null,
        status: 'upcoming',
      },
    })
    return { competition }
  })

  app.patch('/competitions/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>

    const data: Record<string, unknown> = {}
    if (body.title) data.title = body.title
    if (body.description) data.description = body.description
    if (body.status) data.status = body.status
    if (body.prizePool !== undefined) data.prizePool = Number(body.prizePool)
    if (body.entryFeeKes !== undefined) data.entryFeeKes = Number(body.entryFeeKes)
    if (body.entryOpenDate) data.entryOpenDate = new Date(body.entryOpenDate as string)
    if (body.entryCloseDate) data.entryCloseDate = new Date(body.entryCloseDate as string)
    if (body.votingOpenDate) data.votingOpenDate = new Date(body.votingOpenDate as string)
    if (body.votingCloseDate) data.votingCloseDate = new Date(body.votingCloseDate as string)
    if (body.coverImage !== undefined) data.coverImage = body.coverImage

    const competition = await prisma.competition.update({ where: { id }, data })
    return { competition }
  })

  app.delete('/competitions/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.competition.delete({ where: { id } })
    return { success: true }
  })

  // ─── Payments ────────────────────────────────────────────────────────────────

  app.get('/payments', async (req) => {
    const { page = 1, status } = req.query as { page?: number; status?: string }
    const p = Number(page)
    const skip = (p - 1) * 30

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [payments, total] = await Promise.all([
      prisma.paymentLog.findMany({
        where,
        skip,
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.paymentLog.count({ where }),
    ])

    return { payments, total, page: p, hasMore: skip + 30 < total }
  })

  // ─── Orders ──────────────────────────────────────────────────────────────────

  app.get('/orders', async (req) => {
    const { page = 1, status } = req.query as { page?: number; status?: string }
    const p = Number(page)
    const skip = (p - 1) * 25

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    return { orders, total, page: p, hasMore: skip + 25 < total }
  })

  app.patch('/orders/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { status } = req.body as { status: string }
    const order = await prisma.order.update({
      where: { id },
      data: { status },
    })
    return { order }
  })

  // ─── Moderation ──────────────────────────────────────────────────────────────

  app.get('/moderation', async () => {
    const [pendingStaff, flaggedRatings, flaggedPosts] = await Promise.all([
      prisma.staffProfile.findMany({
        where: { verified: false },
        take: 20,
        include: { user: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.serviceRating.findMany({
        where: { flagged: true },
        take: 20,
        include: { client: { select: { id: true, name: true, avatar: true } } },
      }),
      prisma.communityPost.findMany({
        where: { flagged: true },
        take: 20,
        include: {
          author: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        },
      }),
    ])

    const items = [
      ...pendingStaff.map((s) => ({
        id: s.id, type: 'staff_profile' as const,
        entityName: s.user.name, entityAvatar: s.user.avatar,
        reason: 'Pending verification', createdAt: s.createdAt.toISOString(),
      })),
      ...flaggedRatings.map((r) => ({
        id: r.id, type: 'review_image' as const,
        entityName: r.client.name, entityAvatar: r.client.avatar,
        reason: 'Flagged review', createdAt: r.createdAt.toISOString(),
      })),
      ...flaggedPosts.map((p) => ({
        id: p.id, type: 'community_post' as const,
        entityName: p.author.user.name, entityAvatar: p.author.user.avatar,
        reason: 'Flagged post', createdAt: p.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { items }
  })

  app.post('/moderation/:type/:id/approve', async (req, reply) => {
    const { type, id } = req.params as { type: string; id: string }

    if (type === 'staff_profile') {
      await prisma.staffProfile.update({ where: { id }, data: { verified: true } })
      const current = await prisma.staffProfile.findUnique({ where: { id }, select: { badgeIds: true } })
      if (current && !current.badgeIds.includes('verified')) {
        await prisma.staffProfile.update({ where: { id }, data: { badgeIds: { push: 'verified' } } })
      }
    } else if (type === 'review_image') {
      await prisma.serviceRating.update({ where: { id }, data: { flagged: false } })
    } else if (type === 'community_post') {
      await prisma.communityPost.update({ where: { id }, data: { flagged: false } })
    } else {
      return reply.status(400).send({ error: 'Unknown type' })
    }
    return { success: true }
  })

  app.post('/moderation/:type/:id/reject', async (req, reply) => {
    const { type, id } = req.params as { type: string; id: string }
    const { reason } = req.body as { reason: string }

    if (type === 'staff_profile') {
      await prisma.staffProfile.update({ where: { id }, data: { verified: false } })
    } else if (type === 'review_image') {
      await prisma.serviceRating.update({ where: { id }, data: { flagged: true, images: [] } })
    } else if (type === 'community_post') {
      await prisma.communityPost.delete({ where: { id } })
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'moderation_reject',
        entity: type,
        entityId: id,
        meta: { reason },
      },
    })
    return { success: true }
  })
}
