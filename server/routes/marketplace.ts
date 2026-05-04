import type { FastifyInstance } from 'fastify'
import { prisma } from '../index.js'

export default async function marketplaceRoutes(app: FastifyInstance) {
  // GET /marketplace/products
  app.get('/products', async (req) => {
    const {
      category, page = 1, pageSize = 20, q, flashSaleOnly,
    } = req.query as Record<string, string>

    const p = Number(page)
    const ps = Math.min(Number(pageSize), 50)
    const skip = (p - 1) * ps

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (flashSaleOnly === 'true') where.isFlashSale = true
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: ps,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: {
          seller: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    return { products, total, page: p, hasMore: skip + ps < total }
  })

  // GET /marketplace/products/:id
  app.get('/products/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, avatar: true } },
      },
    })
    if (!product) return reply.status(404).send({ error: 'Product not found' })
    return { product }
  })

  // POST /marketplace/orders
  app.post('/orders', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { items, deliveryAddress } = req.body as {
      items: { productId: string; quantity: number }[]
      deliveryAddress?: string
    }

    // Verify stock and calc total
    let totalKes = 0
    const orderItems: { productId: string; quantity: number; priceKes: number }[] = []

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) return reply.status(404).send({ error: `Product ${item.productId} not found` })
      if (product.stock < item.quantity) return reply.status(400).send({ error: `Insufficient stock for ${product.name}` })

      const price = product.isFlashSale && product.flashSalePrice != null
        ? product.flashSalePrice
        : product.priceKes

      totalKes += price * item.quantity
      orderItems.push({ productId: item.productId, quantity: item.quantity, priceKes: price })
    }

    const order = await prisma.order.create({
      data: {
        clientId: req.user.id,
        deliveryAddress: deliveryAddress ?? '',
        totalKes,
        status: 'pending',
        items: {
          create: orderItems,
        },
      },
    })

    return { orderId: order.id, totalKes }
  })
}
