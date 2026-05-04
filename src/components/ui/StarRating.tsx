import { Star } from 'lucide-react'
import { cn, scoreColor } from '@/lib/utils'

interface Props {
  score: number
  max?: number
  interactive?: boolean
  onChange?: (score: number) => void
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
  className?: string
}

export function StarRating({ score, max = 5, interactive = false, onChange, size = 'md', showNumber = false, className }: Props) {
  const starSize = { sm: 12, md: 16, lg: 22 }[size]

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(score)
        const partial = !filled && i < score
        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              'transition-transform',
              interactive && 'hover:scale-125 active:scale-110 cursor-pointer',
              !interactive && 'cursor-default'
            )}
          >
            <Star
              size={starSize}
              className={cn(
                filled ? 'fill-brand-gold text-brand-gold' :
                partial ? 'fill-brand-gold/50 text-brand-gold' :
                'fill-transparent text-white/20'
              )}
            />
          </button>
        )
      })}
      {showNumber && (
        <span className={cn('ml-1 font-mono text-sm font-bold', scoreColor(score))}>
          {score.toFixed(1)}
        </span>
      )}
    </div>
  )
}
