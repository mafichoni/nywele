import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Nywele database...')

  // Seed admin user
  const admin = await prisma.user.upsert({
    where: { phone: '+254700000001' },
    update: {},
    create: {
      supabaseId: 'seed-admin-001',
      phone: '+254700000001',
      name: 'Nywele Admin',
      role: 'ADMIN',
    },
  })
  console.log('✓ Admin user created')

  // Seed sample staff
  const staffData = [
    { name: 'James Kariuki', phone: '+254711001001', specialties: ['barber'], city: 'Nairobi', bio: 'Master barber with 8 years of experience. Specializing in fades, lineups and traditional cuts.', freelance: false, tier: 'FEATURED', points: 4850, rating: 4.9, reviews: 128 },
    { name: 'Amina Hassan', phone: '+254722002002', specialties: ['hair_stylist', 'braider'], city: 'Nairobi', bio: 'Award-winning hair stylist. I create magic with braids, weaves and natural styles.', freelance: true, tier: 'FEATURED', points: 4200, rating: 4.8, reviews: 94 },
    { name: 'Kevin Omondi', phone: '+254733003003', specialties: ['masseur', 'spa_therapist'], city: 'Nairobi', bio: 'Certified spa therapist offering Swedish, deep tissue and hot stone massages. Mobile service available.', freelance: true, tier: 'BASIC', points: 3100, rating: 4.7, reviews: 67, mobileService: true },
    { name: 'Faith Wanjiku', phone: '+254744004004', specialties: ['nail_tech'], city: 'Nairobi', bio: 'Nail artist and technician. Acrylic, gel, nail art – your nails are my canvas!', freelance: false, tier: 'FEATURED', points: 3800, rating: 4.8, reviews: 112 },
    { name: 'Brian Mwangi', phone: '+254755005005', specialties: ['barber'], city: 'Nairobi', bio: 'Fresh cuts, clean lines. Barbering is my passion.', freelance: true, tier: 'BASIC', points: 2200, rating: 4.5, reviews: 45 },
    { name: 'Stella Otieno', phone: '+254766006006', specialties: ['makeup_artist', 'beautician'], city: 'Mombasa', bio: 'Professional makeup artist for weddings, events and everyday glam.', freelance: true, tier: 'FEATURED', points: 3500, rating: 4.9, reviews: 78 },
    { name: 'Peter Njoroge', phone: '+254777007007', specialties: ['loctician', 'braider'], city: 'Nairobi', bio: 'Locs specialist — from starting to maintaining your locs journey.', freelance: false, tier: 'BASIC', points: 1800, rating: 4.6, reviews: 32 },
    { name: 'Grace Muthoni', phone: '+254788008008', specialties: ['esthetician'], city: 'Nairobi', bio: 'Skin care specialist. Facials, peels and skin analysis tailored to your skin type.', freelance: true, tier: 'BASIC', points: 2600, rating: 4.7, reviews: 55, mobileService: true },
  ]

  for (const sd of staffData) {
    const user = await prisma.user.upsert({
      where: { phone: sd.phone },
      update: {},
      create: {
        supabaseId: `seed-staff-${sd.phone.slice(-6)}`,
        phone: sd.phone,
        name: sd.name,
        role: 'STAFF',
      },
    })

    const validUntil = new Date()
    validUntil.setMonth(validUntil.getMonth() + 3)

    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: sd.bio,
        specialties: sd.specialties,
        city: sd.city,
        freelance: sd.freelance,
        mobileService: sd.mobileService ?? false,
        mobileRadiusKm: sd.mobileService ? 15 : null,
        subscriptionTier: sd.tier as 'BASIC' | 'FEATURED',
        subscriptionValidUntil: validUntil,
        totalPoints: sd.points,
        weeklyPoints: Math.floor(sd.points * 0.15),
        avgRating: sd.rating,
        reviewCount: sd.reviews,
        availableToday: Math.random() > 0.3,
        verified: sd.tier === 'FEATURED',
        badgeIds: sd.tier === 'FEATURED' ? ['verified', sd.rating >= 4.8 ? 'five_star' : ''] .filter(Boolean) : [],
      },
    })
  }
  console.log(`✓ ${staffData.length} staff profiles seeded`)

  // Seed competition
  const now = new Date()
  await prisma.competition.upsert({
    where: { id: 'seed-comp-001' },
    update: {},
    create: {
      id: 'seed-comp-001',
      title: 'Best Fade in Nairobi 2025',
      description: 'Show us your cleanest fade. The Nairobi community votes for the ultimate fade master!',
      category: 'haircut',
      entryFeeKes: 200,
      prizePool: 50000,
      entryOpenDate: new Date(now.getTime() - 7 * 86400000),
      entryCloseDate: new Date(now.getTime() + 7 * 86400000),
      votingOpenDate: new Date(now.getTime() + 8 * 86400000),
      votingCloseDate: new Date(now.getTime() + 14 * 86400000),
      status: 'entry_open',
    },
  })

  await prisma.competition.upsert({
    where: { id: 'seed-comp-002' },
    update: {},
    create: {
      id: 'seed-comp-002',
      title: 'Best Nail Art — July Edition',
      description: 'Nail artists: submit your most creative nail design and win big!',
      category: 'nails_acrylic',
      entryFeeKes: 150,
      prizePool: 30000,
      entryOpenDate: new Date(now.getTime() + 14 * 86400000),
      entryCloseDate: new Date(now.getTime() + 21 * 86400000),
      votingOpenDate: new Date(now.getTime() + 22 * 86400000),
      votingCloseDate: new Date(now.getTime() + 28 * 86400000),
      status: 'upcoming',
    },
  })
  console.log('✓ Competitions seeded')

  // Seed sample products
  const products = [
    { name: 'Cantu Shea Butter Leave-In Conditioner', category: 'hair_care', price: 1200, linkedServices: ['braids', 'locs'], endorsed: true },
    { name: 'OPI Nail Lacquer — Infinite Shine', category: 'nail_supplies', price: 1800, linkedServices: ['nails_gel', 'manicure'], endorsed: true },
    { name: 'The Ordinary Niacinamide 10% + Zinc 1%', category: 'skin_care', price: 2200, linkedServices: ['facial'], endorsed: false },
    { name: 'Wahl Professional 5-Star Razor Edger', category: 'tools_equipment', price: 8500, linkedServices: ['haircut'], endorsed: true },
    { name: 'Palmer\'s Cocoa Butter Formula', category: 'skin_care', price: 950, linkedServices: ['massage_swedish'], endorsed: false },
    { name: 'Schwarzkopf BC Bonacure Peptide Repair', category: 'hair_care', price: 3200, linkedServices: ['hair_colour', 'blow_dry'], endorsed: true },
  ]

  const sellerUser = await prisma.user.upsert({
    where: { phone: '+254799009009' },
    update: {},
    create: {
      supabaseId: 'seed-seller-001',
      phone: '+254799009009',
      name: 'Nywele Beauty Supplies',
      role: 'SELLER',
    },
  })

  for (const pd of products) {
    await prisma.product.create({
      data: {
        sellerId: sellerUser.id,
        name: pd.name,
        description: `Premium ${pd.category.replace('_', ' ')} product. Loved by professionals.`,
        category: pd.category,
        linkedServices: pd.linkedServices,
        images: [],
        priceKes: pd.price,
        stock: 50,
        endorsedByStaffIds: [],
        isFeatured: pd.endorsed,
        isFlashSale: pd.price > 2000 && Math.random() > 0.6,
        flashSalePrice: pd.price > 2000 ? pd.price * 0.8 : null,
        flashSaleEndsAt: pd.price > 2000 ? new Date(Date.now() + 48 * 3600000) : null,
      },
    })
  }
  console.log(`✓ ${products.length} products seeded`)

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
