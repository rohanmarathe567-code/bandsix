import { Star } from 'lucide-react'

interface AllRounderBadgeProps {
  show?: boolean
  size?: 'sm' | 'md'
}

export default function AllRounderBadge({ show = true, size = 'md' }: AllRounderBadgeProps) {
  if (!show) return null
  return (
    <span className={`badge badge-allround ${size === 'sm' ? 'text-[10px] px-1.5 py-0' : ''}`}>
      <Star size={size === 'sm' ? 9 : 11} />
      All-rounder
    </span>
  )
}
