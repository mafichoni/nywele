import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index.js'

export default async function competitionsRoutes(app: FastifyInstance) {
  // GET /competitions
  app.get('/', async (req) => {
    const { status } = req.query as { status?: string }
    const where = status ? { status } : {}
    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { votingCloseDate: 'asc' },
    })
    return { competitions }
  })

  // GET /competitions/:id/entries
  app.get('/:id/entries', async (req) => {
    const { id } = req.params as { id: string }
    const entries = await prisma.competitionEntry.findMany({
      where: { competitionId: id },
      orderBy: { voteCount: 'desc' },
      include: {
        staff: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    })
    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }))
    return { entries: ranked }
  })

  // POST /competitions/enter
  app.post('/enter', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'STAFF') return reply.status(403).send({ error: 'Only staff can enter competitions' })

    const { competitionId, imageUrl, caption } = req.body as {
      competitionId: string
      imageUrl: string
      caption?: string
    }

    const competition = await prisma.competition.findUnique({ where: { id: competitionId } })
    if (!competition) return reply.status(404).send({ error: 'Competition not found' })
    if (competition.status !== 'entry_open') return reply.status(400).send({ error: 'Competition is not open for entries' })

    const staff = await prisma.staffProfile.findFirst({ where: { userId: req.user.id } })
    if (!staff) return reply.status(400).send({ error: 'Staff profile not found' })

    const existing = await prisma.competitionEntry.findFirst({
      where: { competitionId, staffId: staff.id },
    })
    if (existing) return reply.status(409).send({ error: 'Already entered this competition' })

    const entry = await prisma.competitionEntry.create({
      data: { competitionId, staffId: staff.id, imageUrl, caption },
    })

    await prisma.competition.update({
      where: { id: competitionId },
      data: { participantCount: { increment: 1 } },
    })

    // XP for entering
    await prisma.staffProfile.update({
      where: { id: staff.id },
      data: { totalPoints: { increment: 10 } },
    })

    return { entry }
  })

  // POST /competitions/entries/:entryId/vote
  app.post('/entries/:entryId/vote', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { entryId } = req.params as { entryId: string }
    const userId = req.user.id
    const voteKey = `vote:${userId}:${entryId}`

    const alreadyVoted = await redis.get(voteKey)
    if (alreadyVoted) return reply.status(429).send({ error: 'already_voted' })

    const entry = await prisma.competitionEntry.findUnique({
      where: { id: entryId },
      include: { competition: true },
    })
    if (!entry) return reply.status(404).send({ error: 'Entry not found' })
    if (entry.competition.status !== 'voting') return reply.status(400).send({ error: 'Voting not open' })

    // Deduct 5 taste points from client
    const clientProfile = await prisma.clientProfile.findFirst({ where: { userId } })
    if (!clientProfile || clientProfile.tastePoints < 5) {
      return reply.status(400).send({ error: 'insufficient_taste_points' })
    }

    await redis.setex(voteKey, 0, '1') // no expiry — one vote per entry per user
    await prisma.clientProfile.update({
      where: { userId },
      data: { tastePoints: { decrement: 5 } },
    })
    const updated = await prisma.competitionEntry.update({
      where: { id: entryId },
      data: { voteCount: { increment: 1 } },
    })
    await prisma.competition.update({
      where: { id: entry.competitionId },
      data: { totalVotes: { increment: 1 } },
    })

    return { voteCount: updated.voteCount }
  })
}
