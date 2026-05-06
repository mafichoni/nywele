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

  // POST /marketplace/products — create product (staff or seller)
  app.post('/products', { preHandler: [app.authenticate] }, async (req, reply) => {
    const allowed = ['STAFF', 'SELLER', 'OUTLET_ADMIN', 'ADMIN']
    if (!allowed.includes(req.user.role)) return reply.status(403).send({ error: 'Forbidden' })

    const { name, description, category, images = [], priceKes, stock, linkedServices = [] } = req.body as {
      name: string; description: string; category: string
      images?: string[]; priceKes: number; stock: number; linkedServices?: string[]
    }

    const product = await prisma.product.create({
      data: {
        sellerId: req.user.id,
        name,
        description,
        category,
        images,
        priceKes,
        stock,
        linkedServices,
      },
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    })
    return { product }
  })

  // PATCH /marketplace/products/:id
  app.patch('/products/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return reply.status(404).send({ error: 'Product not found' })
    if (product.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const { name, description, category, images, priceKes, stock, linkedServices,
      isFlashSale, flashSalePrice, flashSaleEndsAt } = req.body as Record<string, unknown>

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name as string }),
        ...(description !== undefined && { description: description as string }),
        ...(category !== undefined && { category: category as string }),
        ...(images !== undefined && { images: images as string[] }),
        ...(priceKes !== undefined && { priceKes: Number(priceKes) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(linkedServices !== undefined && { linkedServices: linkedServices as string[] }),
        ...(isFlashSale !== undefined && { isFlashSale: Boolean(isFlashSale) }),
        ...(flashSalePrice !== undefined && { flashSalePrice: flashSalePrice ? Number(flashSalePrice) : null }),
        ...(flashSaleEndsAt !== undefined && { flashSaleEndsAt: flashSaleEndsAt ? new Date(flashSaleEndsAt as string) : null }),
      },
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    })
    return { product: updated }
  })

  // DELETE /marketplace/products/:id
  app.delete('/products/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return reply.status(404).send({ error: 'Product not found' })
    if (product.sellerId !== req.user.id && req.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    await prisma.product.delete({ where: { id } })
    return { success: true }
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
