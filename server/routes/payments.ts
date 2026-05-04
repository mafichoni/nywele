import type { FastifyInstance } from 'fastify'
import { prisma, redis } from '../index.js'
import axios from 'axios'

const DARAJA_ENV = process.env.DARAJA_ENV ?? 'sandbox'
const DARAJA_BASE = DARAJA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

const SUBSCRIPTION_PRICES: Record<string, number> = {
  staff_basic: 299,
  staff_featured: 799,
  outlet_basic: 999,
  outlet_featured: 2499,
  seller: 499,
}

async function getDarajaToken(): Promise<string> {
  const cacheKey = 'daraja:token'
  const cached = await redis.get(cacheKey)
  if (cached) return cached

  const credentials = Buffer.from(
    `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`
  ).toString('base64')

  const { data } = await axios.get(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  await redis.setex(cacheKey, 3500, data.access_token)
  return data.access_token
}

async function stkPush(phone: string, amount: number, accountRef: string, description: string) {
  const token = await getDarajaToken()
  const shortcode = process.env.DARAJA_SHORTCODE!
  const passkey = process.env.DARAJA_PASSKEY!
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  const formattedPhone = phone.replace(/^\+/, '').replace(/^0/, '254')

  const { data } = await axios.post(
    `${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.DARAJA_CALLBACK_URL,
      AccountReference: accountRef,
      TransactionDesc: description,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  )

  return data
}

export default async function paymentsRoutes(app: FastifyInstance) {
  // POST /payments/subscribe
  app.post('/subscribe', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { entityId, tier, phone } = req.body as { entityId: string; tier: string; phone: string }
    const amount = SUBSCRIPTION_PRICES[tier]
    if (!amount) return reply.status(400).send({ error: 'Invalid tier' })

    try {
      const stkData = await stkPush(phone, amount, `NYWELE-${entityId.slice(0, 8).toUpperCase()}`, `Nywele ${tier} subscription`)

      // Store pending payment
      await prisma.paymentLog.create({
        data: {
          userId: req.user.id,
          entityId,
          tier,
          amount,
          phone,
          checkoutRequestId: stkData.CheckoutRequestID,
          merchantRequestId: stkData.MerchantRequestID,
          status: 'pending',
        },
      })

      return stkData
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: unknown } })?.response?.data
      return reply.status(502).send({ error: 'M-PESA request failed', detail: msg })
    }
  })

  // GET /payments/status/:checkoutRequestId
  app.get('/status/:checkoutRequestId', { preHandler: [app.authenticate] }, async (req) => {
    const { checkoutRequestId } = req.params as { checkoutRequestId: string }
    const log = await prisma.paymentLog.findFirst({ where: { checkoutRequestId } })
    return { status: log?.status ?? 'pending', log }
  })

  // POST /webhooks/mpesa — Daraja callback (no auth)
  app.post('/webhooks/mpesa', async (req, reply) => {
    const body = req.body as {
      Body: {
        stkCallback: {
          MerchantRequestID: string
          CheckoutRequestID: string
          ResultCode: number
          ResultDesc: string
          CallbackMetadata?: { Item: { Name: string; Value: unknown }[] }
        }
      }
    }

    const cb = body.Body.stkCallback
    const success = cb.ResultCode === 0

    const log = await prisma.paymentLog.findFirst({
      where: { checkoutRequestId: cb.CheckoutRequestID },
    })

    if (!log) return reply.send({ ResultCode: 0, ResultDesc: 'Accepted' })

    if (success) {
      const mpesaRef = cb.CallbackMetadata?.Item.find((i) => i.Name === 'MpesaReceiptNumber')?.Value as string

      await prisma.paymentLog.update({
        where: { id: log.id },
        data: { status: 'success', mpesaRef },
      })

      // Activate subscription
      const validUntil = new Date()
      validUntil.setMonth(validUntil.getMonth() + 1)

      if (log.tier.startsWith('staff_') || log.tier === 'seller') {
        await prisma.staffProfile.update({
          where: { id: log.entityId },
          data: {
            subscriptionTier: log.tier === 'staff_featured' ? 'FEATURED' : 'BASIC',
            subscriptionValidUntil: validUntil,
          },
        })
      } else if (log.tier.startsWith('outlet_')) {
        await prisma.outlet.update({
          where: { id: log.entityId },
          data: {
            subscriptionTier: log.tier === 'outlet_featured' ? 'FEATURED' : 'BASIC',
            subscriptionValidUntil: validUntil,
          },
        })
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: log.userId,
          action: 'subscription_activated',
          entity: 'subscription',
          entityId: log.entityId,
          meta: { tier: log.tier, amount: log.amount, mpesaRef },
        },
      })
    } else {
      await prisma.paymentLog.update({
        where: { id: log.id },
        data: { status: 'failed' },
      })
    }

    return reply.send({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // POST /payments/marketplace
  app.post('/marketplace', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { orderId, phone } = req.body as { orderId: string; phone: string }
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return reply.status(404).send({ error: 'Order not found' })

    const stkData = await stkPush(phone, order.totalKes, `NYWELE-ORD-${orderId.slice(0, 6).toUpperCase()}`, 'Nywele Marketplace Purchase')

    await prisma.paymentLog.create({
      data: {
        userId: req.user.id,
        entityId: orderId,
        tier: 'marketplace',
        amount: order.totalKes,
        phone,
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        status: 'pending',
      },
    })

    return stkData
  })
}
