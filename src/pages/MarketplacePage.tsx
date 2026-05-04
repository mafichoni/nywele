import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, ShoppingCart, X, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { MpesaSubscribeModal } from '@/components/payments/MpesaSubscribeModal'
import { useToast } from '@/components/ui/Toast'
import { useCartStore } from '@/store/cartStore'
import { marketplaceApi } from '@/lib/api'
import { formatKes, formatCountdown, vibrate } from '@/lib/utils'
import type { Product, ProductCategory } from '@/types'

const CATEGORIES: { key: ProductCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🛍️' },
  { key: 'hair_care', label: 'Hair Care', emoji: '💇' },
  { key: 'skin_care', label: 'Skin Care', emoji: '🧴' },
  { key: 'nail_supplies', label: 'Nail Supplies', emoji: '💅' },
  { key: 'tools_equipment', label: 'Tools', emoji: '✂️' },
  { key: 'fragrances', label: 'Fragrances', emoji: '🌸' },
  { key: 'wellness', label: 'Wellness', emoji: '🧘' },
]

export default function MarketplacePage() {
  const { toast } = useToast()
  const { items: cartItems, addItem, removeItem, updateQty, totalKes, itemCount, clearCart } = useCartStore()

  const [category, setCategory] = useState<ProductCategory | 'all'>('all')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    marketplaceApi.getProducts({ category: category === 'all' ? undefined : category })
      .then(({ data }) => setProducts(data.products))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category])

  function handleAddToCart(product: Product) {
    vibrate(40)
    addItem(product)
    toast(`${product.name} added to cart`, 'success')
  }

  async function handleCheckout() {
    try {
      const { data } = await marketplaceApi.createOrder({
        items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      })
      setOrderId(data.orderId)
      setCartOpen(false)
      setCheckoutOpen(true)
    } catch {
      toast('Could not create order. Try again.', 'error')
    }
  }

  const flashSales = products.filter((p) => p.isFlashSale)
  const regular = products.filter((p) => !p.isFlashSale)

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-onyx/95 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-brand-gold" />
            <h1 className="font-heading font-bold text-xl text-white">Market</h1>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 text-silver hover:text-white transition-colors"
          >
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-brand-gold text-onyx text-[9px] font-bold flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${category === key ? 'bg-brand-gold text-brand-green font-bold' : 'bg-white/8 text-silver hover:text-white'}`}
            >
              <span>{emoji}</span>{label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Flash Sales */}
            {flashSales.length > 0 && (
              <section>
                <h2 className="font-heading font-bold text-white text-base mb-3 flex items-center gap-2">
                  ⚡ Flash Sales
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                  {flashSales.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={() => handleAddToCart(product)} />
                  ))}
                </div>
              </section>
            )}

            {/* Regular products */}
            <section>
              {flashSales.length > 0 && (
                <h2 className="font-heading font-bold text-white text-base mb-3">All Products</h2>
              )}
              {regular.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🛍️</div>
                  <div className="font-heading font-bold text-white">No products here yet</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {regular.map((product) => (
                    <ProductCard key={product.id} product={product} onAdd={() => handleAddToCart(product)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl bg-onyx border-t border-white/10 max-h-[80vh] flex flex-col"
            >
              <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between">
                <div className="font-heading font-bold text-white">Cart ({itemCount})</div>
                <button onClick={() => setCartOpen(false)}><X size={18} className="text-silver" /></button>
              </div>

              {cartItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart size={40} className="text-silver/30 mb-3" />
                  <div className="text-silver">Your cart is empty</div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cartItems.map(({ product, quantity }) => (
                      <div key={product.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                        {product.images[0] && (
                          <img src={product.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{product.name}</div>
                          <div className="text-brand-gold font-mono text-sm">
                            {formatKes(product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.priceKes)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => updateQty(product.id, quantity - 1)} className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                            <Minus size={10} />
                          </button>
                          <span className="text-white text-sm font-mono w-4 text-center">{quantity}</span>
                          <button onClick={() => updateQty(product.id, quantity + 1)} className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-white/8 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-silver">Total</span>
                      <span className="font-mono font-bold text-brand-gold text-lg">{formatKes(totalKes)}</span>
                    </div>
                    <Button variant="gold" size="lg" fullWidth onClick={handleCheckout}>
                      Checkout via M-PESA
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout payment modal */}
      {orderId && (
        <MpesaSubscribeModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          entityId={orderId}
          onSuccess={() => { clearCart(); toast('Order placed! 🎉', 'success') }}
        />
      )}
    </div>
  )
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const cartItems = useCartStore((s) => s.items)
  const inCart = cartItems.some((i) => i.product.id === product.id)
  const price = product.isFlashSale && product.flashSalePrice ? product.flashSalePrice : product.priceKes

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden flex flex-col"
    >
      <div className="relative aspect-square bg-white/5 overflow-hidden">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>
        )}
        {product.isFlashSale && (
          <div className="absolute top-1.5 left-1.5 rounded-full bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5">
            ⚡ SALE
          </div>
        )}
        {product.endorsedByStaffIds.length > 0 && (
          <div className="absolute top-1.5 right-1.5 rounded-full bg-brand-gold/90 text-brand-green text-[9px] font-bold px-1.5 py-0.5">
            ⭐ Staff Pick
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="font-body font-semibold text-white text-xs line-clamp-2 leading-tight">{product.name}</div>
        <div className="flex items-end gap-1.5 mt-auto">
          <span className="font-mono font-bold text-brand-gold text-sm">{formatKes(price)}</span>
          {product.isFlashSale && (
            <span className="text-silver text-[10px] line-through">{formatKes(product.priceKes)}</span>
          )}
        </div>
        {product.isFlashSale && product.flashSaleEndsAt && (
          <div className="text-[10px] text-red-400 flex items-center gap-1">
            ⏳ Ends in <Countdown endsAt={product.flashSaleEndsAt} />
          </div>
        )}
        <button
          onClick={onAdd}
          disabled={product.stock === 0}
          className={`w-full rounded-lg py-1.5 text-xs font-semibold transition-all ${
            product.stock === 0 ? 'bg-white/5 text-silver cursor-not-allowed' :
            inCart ? 'bg-brand-gold/20 text-brand-gold' : 'bg-brand-green-mid text-white hover:bg-brand-green'
          }`}
        >
          {product.stock === 0 ? 'Out of Stock' : inCart ? '✓ In Cart' : '+ Add to Cart'}
        </button>
      </div>
    </motion.div>
  )
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const { hours, mins, secs, expired } = formatCountdown(endsAt)
  if (expired) return <span className="text-red-400">Ended</span>
  return <span className="font-mono">{hours.toString().padStart(2, '0')}:{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</span>
}
