import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { CartItem, Product } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (product: Product, qty?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  totalKes: number
  itemCount: number
}

export const useCartStore = create<CartState>()(
  persist(
    immer((set, get) => ({
      items: [],

      addItem: (product, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product.id === product.id)
          if (existing) {
            existing.quantity += qty
          } else {
            s.items.push({ product, quantity: qty })
          }
        }),

      removeItem: (productId) =>
        set((s) => { s.items = s.items.filter((i) => i.product.id !== productId) }),

      updateQty: (productId, qty) =>
        set((s) => {
          const item = s.items.find((i) => i.product.id === productId)
          if (item) item.quantity = Math.max(0, qty)
          s.items = s.items.filter((i) => i.quantity > 0)
        }),

      clearCart: () => set((s) => { s.items = [] }),

      get totalKes() {
        return get().items.reduce((sum, i) => {
          const price = i.product.isFlashSale && i.product.flashSalePrice != null
            ? i.product.flashSalePrice
            : i.product.priceKes
          return sum + price * i.quantity
        }, 0)
      },

      get itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },
    })),
    { name: 'nywele-cart' }
  )
)
