import axios from 'axios'
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1'

export const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      supabase.auth.signOut()
    }
    return Promise.reject(err)
  }
)

// ─── Staff ────────────────────────────────────────────────────────────────────
export const staffApi = {
  getFeed: (params: Record<string, unknown>) => api.get('/feed', { params }),
  getProfile: (id: string) => api.get(`/staff/${id}`),
  updateProfile: (id: string, data: Record<string, unknown>) => api.patch(`/staff/${id}`, data),
  upvote: (staffId: string) => api.post(`/staff/${staffId}/upvote`),
  toggleAvailability: (staffId: string) => api.post(`/staff/${staffId}/availability`),
  togglePlacementAvailable: (staffId: string) => api.post(`/staff/${staffId}/placement-available`),
  addMenuItem: (staffId: string, data: Record<string, unknown>) => api.post(`/staff/${staffId}/menu-items`, data),
  updateMenuItem: (staffId: string, itemId: string, data: Record<string, unknown>) => api.patch(`/staff/${staffId}/menu-items/${itemId}`, data),
  deleteMenuItem: (staffId: string, itemId: string) => api.delete(`/staff/${staffId}/menu-items/${itemId}`),
}

// ─── Ratings ─────────────────────────────────────────────────────────────────
export const ratingsApi = {
  submitServiceRating: (data: FormData) => api.post('/ratings/service', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  submitClientRating: (data: Record<string, unknown>) => api.post('/ratings/client', data),
  getStaffRatings: (staffId: string, page = 1) => api.get(`/ratings/staff/${staffId}`, { params: { page } }),
  getMyRatings: (page = 1) => api.get('/ratings/my', { params: { page } }),
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export const leaderboardApi = {
  getStaffLeaderboard: (specialty: string, city: string, period: string) =>
    api.get('/leaderboard/staff', { params: { specialty, city, period } }),
  getOutletLeaderboard: (city: string, period: string) =>
    api.get('/leaderboard/outlets', { params: { city, period } }),
}

// ─── MPESA ───────────────────────────────────────────────────────────────────
export const mpesaApi = {
  initiateSubscription: (data: { entityId: string; tier: string; phone: string }) =>
    api.post('/payments/subscribe', data),
  checkSubscriptionStatus: (checkoutRequestId: string) =>
    api.get(`/payments/status/${checkoutRequestId}`),
  initiateMarketplacePurchase: (data: { orderId: string; phone: string }) =>
    api.post('/payments/marketplace', data),
}

// ─── Competitions ─────────────────────────────────────────────────────────────
export const competitionsApi = {
  list: (status?: string) => api.get('/competitions', { params: { status } }),
  getEntries: (competitionId: string) => api.get(`/competitions/${competitionId}/entries`),
  enter: (data: FormData) => api.post('/competitions/enter', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  vote: (entryId: string) => api.post(`/competitions/entries/${entryId}/vote`),
}

// ─── Marketplace ─────────────────────────────────────────────────────────────
export const marketplaceApi = {
  getProducts: (params: Record<string, unknown>) => api.get('/marketplace/products', { params }),
  getProduct: (id: string) => api.get(`/marketplace/products/${id}`),
  createOrder: (data: Record<string, unknown>) => api.post('/marketplace/orders', data),
  createProduct: (data: Record<string, unknown>) => api.post('/marketplace/products', data),
  updateProduct: (id: string, data: Record<string, unknown>) => api.patch(`/marketplace/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/marketplace/products/${id}`),
}

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: { name?: string; avatar?: string }) => api.patch('/users/me', data),
}

// ─── Auth (backend-managed OTP, no SMS provider needed) ──────────────────────
export const authApi = {
  requestOtp: (phone: string) => api.post('/auth/request-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  adminLogin: (phone: string, password: string) => api.post('/auth/admin-login', { phone, password }),
}

// ─── Community ───────────────────────────────────────────────────────────────
export const communityApi = {
  getFeed: (page = 1) => api.get('/community/feed', { params: { page } }),
  createPost: (data: FormData) => api.post('/community/posts', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getJobs: (city?: string) => api.get('/community/jobs', { params: { city } }),
  applyForJob: (jobId: string) => api.post(`/community/jobs/${jobId}/apply`),
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  getModerationQueue: () => api.get('/admin/moderation'),
  approveItem: (type: string, id: string) => api.post(`/admin/moderation/${type}/${id}/approve`),
  rejectItem: (type: string, id: string, reason: string) => api.post(`/admin/moderation/${type}/${id}/reject`, { reason }),
  getStats: () => api.get('/admin/stats'),
}
