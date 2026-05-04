import { cn } from '@/lib/utils'

interface Props {
  src: string | null | undefined
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  ring?: 'gold' | 'green' | 'none'
}

const SIZES = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

const RINGS = {
  gold: 'ring-2 ring-brand-gold ring-offset-1 ring-offset-onyx',
  green: 'ring-2 ring-brand-green-light ring-offset-1 ring-offset-onyx',
  none: '',
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ src, name, size = 'md', className, ring = 'none' }: Props) {
  return (
    <div
      className={cn(
        'relative shrink-0 rounded-full overflow-hidden bg-brand-green-mid flex items-center justify-center font-heading font-bold text-white',
        SIZES[size],
        RINGS[ring],
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  )
}
