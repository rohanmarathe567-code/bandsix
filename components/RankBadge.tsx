import { Medal } from 'lucide-react'

interface RankBadgeProps {
  rank: number
  size?: 'sm' | 'md' | 'lg'
}

const configs = {
  1: {
    label: '#1',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-rank-gold',
    icon: true,
  },
  2: {
    label: '#2',
    className: 'bg-slate-400/15 text-slate-300 border-slate-400/30 shadow-rank-silver',
    icon: true,
  },
  3: {
    label: '#3',
    className: 'bg-amber-700/20 text-amber-600 border-amber-700/40 shadow-rank-bronze',
    icon: true,
  },
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-0.5',
  md: 'text-sm px-2 py-1 gap-1',
  lg: 'text-base px-3 py-1.5 gap-1.5',
}

export default function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const config = configs[rank as keyof typeof configs]

  if (config) {
    return (
      <span
        className={`inline-flex items-center rounded-full border font-bold ${config.className} ${sizeClasses[size]}`}
      >
        {config.icon && <Medal size={size === 'sm' ? 10 : size === 'lg' ? 16 : 12} />}
        {config.label}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-full border border-border bg-bg-elevated text-text-secondary font-mono font-medium ${sizeClasses[size]}`}>
      #{rank}
    </span>
  )
}
