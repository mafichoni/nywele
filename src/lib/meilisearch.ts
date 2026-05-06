import { Meilisearch as MeiliSearch } from 'meilisearch'

const host = import.meta.env.VITE_MEILISEARCH_HOST ?? 'http://localhost:7700'
const apiKey = import.meta.env.VITE_MEILISEARCH_KEY ?? ''

export const searchClient = new MeiliSearch({ host, apiKey })

export const staffIndex = searchClient.index('staff')
export const outletIndex = searchClient.index('outlets')
export const productIndex = searchClient.index('products')

export async function searchStaff(query: string, filters?: {
  specialty?: string
  city?: string
  freelance?: boolean
  mobileService?: boolean
  availableToday?: boolean
  lat?: number
  lng?: number
  radiusKm?: number
}) {
  const filterParts: string[] = []
  if (filters?.specialty) filterParts.push(`specialties = "${filters.specialty}"`)
  if (filters?.city) filterParts.push(`city = "${filters.city}"`)
  if (filters?.freelance) filterParts.push('freelance = true')
  if (filters?.mobileService) filterParts.push('mobileService = true')
  if (filters?.availableToday) filterParts.push('availableToday = true')

  const geoFilter =
    filters?.lat && filters?.lng && filters?.radiusKm
      ? `_geoRadius(${filters.lat}, ${filters.lng}, ${filters.radiusKm * 1000})`
      : undefined

  const allFilters = [...filterParts, ...(geoFilter ? [geoFilter] : [])].join(' AND ')

  return staffIndex.search(query, {
    filter: allFilters || undefined,
    sort: filters?.lat && filters?.lng ? [`_geoPoint(${filters.lat}, ${filters.lng}):asc`] : ['totalPoints:desc'],
    hitsPerPage: 20,
    attributesToHighlight: ['user.name', 'bio'],
  })
}

export async function searchAll(query: string) {
  return searchClient.multiSearch({
    queries: [
      { indexUid: 'staff', q: query, limit: 5 },
      { indexUid: 'outlets', q: query, limit: 5 },
      { indexUid: 'products', q: query, limit: 5 },
    ],
  })
}
