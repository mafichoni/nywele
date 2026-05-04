import type { FastifyInstance } from 'fastify'
import { prisma } from '../index.js'

export default async function communityRoutes(app: FastifyInstance) {
  // GET /community/feed
  app.get('/feed', async (req) => {
    const { page = 1 } = req.query as { page?: number }
    const p = Number(page)
    const skip = (p - 1) * 20

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        skip,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      }),
      prisma.communityPost.count(),
    ])

    return { posts, total, page: p, hasMore: skip + 20 < total }
  })

  // POST /community/posts
  app.post('/posts', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STAFF') return reply.status(403).send({ error: 'Only staff can post' })

    const { caption, imageUrl, tags } = req.body as {
      caption: string
      imageUrl?: string
      tags?: string[]
    }

    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user.id } })
    if (!staff) return reply.status(400).send({ error: 'No staff profile' })

    const post = await prisma.communityPost.create({
      data: { authorId: staff.id, caption, imageUrl, tags: tags ?? [] },
    })
    return { post }
  })

  // GET /community/jobs
  app.get('/jobs', async (req) => {
    const { city } = req.query as { city?: string }
    const jobs = await prisma.jobPosting.findMany({
      where: {
        expiresAt: { gte: new Date() },
        ...(city && { outlet: { city } }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        outlet: { select: { id: true, name: true, city: true, logoImage: true, address: true } },
      },
    })
    return { jobs }
  })

  // POST /community/jobs/:id/apply
  app.post('/jobs/:id/apply', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STAFF') return reply.status(403).send({ error: 'Only staff can apply' })

    const { id } = req.params as { id: string }
    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user.id } })
    if (!staff) return reply.status(400).send({ error: 'No staff profile' })

    const existing = await prisma.jobApplication.findFirst({
      where: { jobPostingId: id, staffId: staff.id },
    })
    if (existing) return reply.status(409).send({ error: 'Already applied' })

    const application = await prisma.jobApplication.create({
      data: { jobPostingId: id, staffId: staff.id },
    })
    await prisma.jobPosting.update({
      where: { id },
      data: { applicantCount: { increment: 1 } },
    })
    return { application }
  })
}
