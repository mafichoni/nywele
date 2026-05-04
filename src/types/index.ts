// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'CLIENT' | 'STAFF' | 'OUTLET_ADMIN' | 'SELLER' | 'ADMIN'
export type SubscriptionTier = 'BASIC' | 'FEATURED' | 'NONE'
export type OutletType = 'SALON' | 'SPA' | 'BARBERSHOP' | 'WELLNESS' | 'NAIL_STUDIO' | 'MULTI'
export type BadgeId =
  | 'crown'
  | 'five_star'
  | 'photo_pro'
  | 'rising_star'
  | 'competition_winner'
  | 'mobile_pro'
  | 'verified'
  | 'placement_veteran'
  | 'mentor'

export type Specialty =
  | 'barber'
  | 'hair_stylist'
  | 'nail_tech'
  | 'masseur'
  | 'spa_therapist'
  | 'beautician'
  | 'braider'
  | 'loctician'
  | 'esthetician'
  | 'makeup_artist'
  | 'eyebrow_tech'
  | 'pedicurist'

export type ServiceCategory =
  | 'haircut'
  | 'hair_colour'
  | 'braids'
  | 'locs'
  | 'weave'
  | 'relaxer'
  | 'blow_dry'
  | 'facial'
  | 'massage_swedish'
  | 'massage_deep_tissue'
  | 'massage_hot_stone'
  | 'massage_sports'
  | 'nails_acrylic'
  | 'nails_gel'
  | 'nails_natural'
  | 'pedicure'
  | 'manicure'
  | 'makeup_bridal'
  | 'makeup_everyday'
  | 'eyebrows'
  | 'waxing'

// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  phone: string
  name: string
  avatar: string | null
  role: UserRole
  createdAt: string
}

export interface StaffProfile {
  id: string
  userId: string
  user: User
  bio: string | null
  specialties: Specialty[]
  outletId: string | null
  outlet: Outlet | null
  freelance: boolean
  mobileService: boolean
  mobileRadiusKm: number | null
  serviceMenuItems: ServiceMenuItem[]
  portfolioImages: PortfolioImage[]
  subscriptionTier: SubscriptionTier
  subscriptionValidUntil: string | null
  totalPoints: number
  weeklyPoints: number
  badgeIds: BadgeId[]
  availableToday: boolean
  availableForPlacement: boolean
  latitude: number | null
  longitude: number | null
  city: string
  avgRating: number
  reviewCount: number
  upvoteCount: number
  createdAt: string
}

export interface Outlet {
  id: string
  name: string
  type: OutletType
  description: string | null
  address: string
  city: string
  latitude: number
  longitude: number
  phone: string | null
  instagram: string | null
  coverImage: string | null
  logoImage: string | null
  subscriptionTier: SubscriptionTier
  subscriptionValidUntil: string | null
  featuredUntil: string | null
  aggregatePoints: number
  staffCount: number
  avgRating: number
  createdAt: string
}

export interface ServiceMenuItem {
  id: string
  staffId: string
  category: ServiceCategory
  name: string
  description: string | null
  priceMin: number | null
  priceMax: number | null
  durationMinutes: number | null
  avgRating: number
  ratingCount: number
}

export interface PortfolioImage {
  id: string
  staffId: string
  imageUrl: string
  caption: string | null
  service: ServiceCategory | null
  upvotes: number
  uploadedByClientId: string | null
  createdAt: string
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

export interface ServiceRating {
  id: string
  clientId: string
  client: Pick<User, 'id' | 'name' | 'avatar'>
  staffId: string
  serviceCategory: ServiceCategory
  score: number
  review: string | null
  images: string[]
  upvotes: number
  createdAt: string
}

export interface ClientRating {
  id: string
  staffId: string
  clientId: string
  professionalism: number
  punctuality: number
  paymentReliability: number
  overallScore: number
  notes: string | null
  createdAt: string
}

export interface ClientProfile {
  id: string
  userId: string
  user: User
  tastePoints: number
  tasteTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  avgStaffRating: number
  badgeIds: BadgeId[]
  totalRatingsGiven: number
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  previousRank: number | null
  staffId?: string
  outletId?: string
  name: string
  avatar: string | null
  specialty?: Specialty
  outletType?: OutletType
  city: string
  score: number
  weeklyScore: number
  badgeIds: BadgeId[]
  subscriptionTier: SubscriptionTier
  change: 'up' | 'down' | 'same' | 'new'
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime'
export type LeaderboardType = 'staff' | 'outlet'

// ─── Competitions ─────────────────────────────────────────────────────────────

export type CompetitionStatus = 'upcoming' | 'entry_open' | 'voting' | 'closed' | 'prizes_paid'

export interface Competition {
  id: string
  title: string
  description: string
  category: ServiceCategory
  coverImage: string | null
  entryFeeKes: number
  prizePool: number
  entryOpenDate: string
  entryCloseDate: string
  votingOpenDate: string
  votingCloseDate: string
  status: CompetitionStatus
  participantCount: number
  totalVotes: number
  createdAt: string
}

export interface CompetitionEntry {
  id: string
  competitionId: string
  competition: Competition
  staffId: string
  staff: StaffProfile
  imageUrl: string
  caption: string | null
  voteCount: number
  rank: number | null
  mpesaRef: string | null
  createdAt: string
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'hair_care'
  | 'skin_care'
  | 'nail_supplies'
  | 'tools_equipment'
  | 'fragrances'
  | 'wellness'

export interface Product {
  id: string
  sellerId: string
  seller: Pick<User, 'id' | 'name' | 'avatar'>
  name: string
  description: string
  category: ProductCategory
  linkedServices: ServiceCategory[]
  images: string[]
  priceKes: number
  stock: number
  endorsedByStaffIds: string[]
  endorsedByStaff: Pick<StaffProfile, 'id' | 'totalPoints' | 'badgeIds'>[]
  avgRating: number
  reviewCount: number
  isFeatured: boolean
  isFlashSale: boolean
  flashSalePrice: number | null
  flashSaleEndsAt: string | null
  createdAt: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  clientId: string
  items: OrderItem[]
  totalKes: number
  deliveryAddress: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  mpesaRef: string | null
  createdAt: string
}

export interface OrderItem {
  productId: string
  product: Product
  quantity: number
  priceKes: number
}

// ─── Subscriptions & Payments ─────────────────────────────────────────────────

export interface Subscription {
  id: string
  entityId: string
  entityType: 'STAFF' | 'OUTLET' | 'SELLER'
  tier: SubscriptionTier
  priceKes: number
  mpesaRef: string | null
  validFrom: string
  validUntil: string
  autoRenew: boolean
  status: 'active' | 'lapsed' | 'cancelled'
}

export interface MpesaStkPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

// ─── Community / Placement ────────────────────────────────────────────────────

export interface CommunityPost {
  id: string
  authorId: string
  author: StaffProfile
  imageUrl: string | null
  videoUrl: string | null
  caption: string
  tags: Specialty[]
  likeCount: number
  commentCount: number
  createdAt: string
}

export interface JobPosting {
  id: string
  outletId: string
  outlet: Outlet
  title: string
  specialtiesNeeded: Specialty[]
  description: string
  salaryMin: number | null
  salaryMax: number | null
  isFullTime: boolean
  expiresAt: string
  applicantCount: number
  createdAt: string
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface GeoLocation {
  latitude: number
  longitude: number
  city: string
}

export interface FeedFilters {
  specialty: Specialty | null
  city: string | null
  freelanceOnly: boolean
  mobileServiceOnly: boolean
  availableToday: boolean
  featuredOnly: boolean
  maxDistanceKm: number
}

export interface SearchResult {
  hits: StaffProfile[] | Outlet[] | Product[]
  estimatedTotalHits: number
  query: string
}
