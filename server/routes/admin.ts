import type { FastifyInstance } from 'fastify'
import { prisma } from '../index.js'

export default async function adminRoutes(app: FastifyInstance) {
  // All admin routes require ADMIN role
  app.addHook('preHandler', async (req, reply) => {
    await app.authenticate(req, reply)
    if (req.user?.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
  })

  // GET /admin/moderation
  app.get('/moderation', async () => {
    // Collect pending items: unverified profiles, flagged images, unapproved posts
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
        id: s.id,
        type: 'staff_profile' as const,
        entityName: s.user.name,
        entityAvatar: s.user.avatar,
        reason: 'Pending verification',
        createdAt: s.createdAt.toISOString(),
      })),
      ...flaggedRatings.map((r) => ({
        id: r.id,
        type: 'review_image' as const,
        entityName: r.client.name,
        entityAvatar: r.client.avatar,
        reason: 'Flagged review',
        createdAt: r.createdAt.toISOString(),
      })),
      ...flaggedPosts.map((p) => ({
        id: p.id,
        type: 'community_post' as const,
        entityName: p.author.user.name,
        entityAvatar: p.author.user.avatar,
        reason: 'Flagged post',
        createdAt: p.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return { items }
  })

  // POST /admin/moderation/:type/:id/approve
  app.post('/moderation/:type/:id/approve', async (req, reply) => {
    const { type, id } = req.params as { type: string; id: string }

    if (type === 'staff_profile') {
      await prisma.staffProfile.update({ where: { id }, data: { verified: true } })
      await prisma.staffProfile.update({
        where: { id },
        data: { badgeIds: { push: 'verified' } },
      })
    } else if (type === 'review_image') {
      await prisma.serviceRating.update({ where: { id }, data: { flagged: false } })
    } else if (type === 'community_post') {
      await prisma.communityPost.update({ where: { id }, data: { flagged: false } })
    } else {
      return reply.status(400).send({ error: 'Unknown type' })
    }

    return { success: true }
  })

  // POST /admin/moderation/:type/:id/reject
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

  // GET /admin/stats
  app.get('/stats', async () => {
    const [
      totalStaff, activeSubscriptions, totalRatings,
      pendingModeration, competitionsActive, mrr,
    ] = await Promise.all([
      prisma.staffProfile.count(),
      prisma.staffProfile.count({ where: { subscriptionTier: { not: 'NONE' } } }),
      prisma.serviceRating.count(),
      prisma.staffProfile.count({ where: { verified: false } }),
      prisma.competition.count({ where: { status: { in: ['entry_open', 'voting'] } } }),
      prisma.paymentLog.aggregate({
        where: {
          status: 'success',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
    ])

    return {
      totalStaff,
      activeSubscriptions,
      totalRatings,
      pendingModeration,
      competitionsActive,
      mrr: mrr._sum.amount ?? 0,
    }
  })
}
