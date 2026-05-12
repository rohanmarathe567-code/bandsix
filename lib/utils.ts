import type { SchoolType } from './types'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function unslugify(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function classifySchoolType(name: string): SchoolType {
  const lower = name.toLowerCase()
  if (lower.includes('catholic') || lower.includes('st ') || lower.includes('holy') || lower.includes('marist') || lower.includes('salesian') || lower.includes('lasalle') || lower.includes('mercy') || lower.includes('dominican') || lower.includes('presentation') || lower.includes('immaculate') || lower.includes('assumption') || lower.includes('xavier') || lower.includes('ignatius')) {
    return 'catholic'
  }
  if (lower.includes('grammar') || lower.includes("boys'") || lower.includes("girls'") || lower.includes('college') || lower.includes('academy') || lower.includes('scots') || lower.includes('shore') || lower.includes('barker') || lower.includes('knox') || lower.includes('kambala') || lower.includes('pymble') || lower.includes('ravenswood') || lower.includes('cranbrook') || lower.includes('abbotsleigh')) {
    return 'independent'
  }
  if (lower.includes('high school') || lower.includes('selective') || lower.includes('public')) {
    return 'public'
  }
  return 'other'
}

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  all: 'All Types',
  public: 'Public',
  catholic: 'Catholic',
  independent: 'Independent',
  other: 'Other',
}

export const SCHOOL_TYPE_COLOURS: Record<SchoolType, string> = {
  public:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
  catholic:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  independent: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  other:       'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

export const HSC_YEARS = Array.from(
  { length: new Date().getFullYear() - 1999 },
  (_, i) => new Date().getFullYear() - i
) // current year down to 2000

export const CURRENT_YEAR = new Date().getFullYear()

export function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function rankLabel(rank: number): string {
  return ordinal(rank)
}

export function getBandColour(band: string): string {
  switch (band) {
    case 'Band 6':
    case 'E4':     return 'text-emerald-400'
    case 'Band 5':
    case 'E3':     return 'text-cyan-400'
    case 'Band 4':
    case 'E2':     return 'text-blue-400'
    default:       return 'text-text-secondary'
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}
