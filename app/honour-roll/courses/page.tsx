'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronUp, ChevronDown, SlidersHorizontal, Search, Crown } from 'lucide-react'
import RankBadge from '@/components/RankBadge'
import { HSC_YEARS } from '@/lib/utils'
import type { CourseRanking } from '@/lib/types'

const CATEGORIES = ['All', 'Mathematics', 'English', 'Science', 'HSIE', 'Creative Arts', 'TAS', 'PD/H/PE', 'Languages', 'VET']

type SortField = 'rank' | 'total_b6' | 'state_ranks_count'

export default function CourseRankingsPage() {
  const [year, setYear]       = useState(2025)
  const [category, setCategory] = useState('All')
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState<SortField>('total_b6')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [data, setData]       = useState<CourseRanking[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year:     String(year),
        category: category === 'All' ? 'all' : category,
        search,
        sort_by:  sortBy,
        sort_dir: sortDir,
      })
      const res  = await fetch(`/api/honour-roll/courses?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [year, category, search, sortBy, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ChevronDown size={12} className="text-text-muted opacity-30" />
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-primary-light" />
      : <ChevronUp size={12} className="text-primary-light" />
  }

  const categoryColours: Record<string, string> = {
    Mathematics:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
    English:         'bg-violet-500/15 text-violet-400 border-violet-500/30',
    Science:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    HSIE:            'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'Creative Arts': 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    TAS:             'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'PD/H/PE':       'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    Languages:       'bg-rose-500/15 text-rose-400 border-rose-500/30',
    VET:             'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <BookOpen size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-primary">Course Rankings</h1>
            <p className="text-text-secondary text-sm">NSW HSC Honour Roll, by Band 6 / E4 count per course</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-sm">Year:</label>
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {HSC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-text-muted text-sm">Category:</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search course…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center text-text-muted text-sm ml-auto">
          <SlidersHorizontal size={13} className="mr-1.5" />
          {loading ? '…' : total.toLocaleString()} courses
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-striped">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium w-16">Rank</th>
                <th className="px-4 py-3 text-left font-medium">Course</th>
                <th className="px-4 py-3 text-center font-medium hidden sm:table-cell w-28">Category</th>
                <th className="px-4 py-3 text-center font-medium hidden sm:table-cell w-16">Units</th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none hover:text-text-primary w-28"
                  onClick={() => handleSort('total_b6')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Band 6s <SortIcon field="total_b6" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none hover:text-text-primary hidden md:table-cell w-32"
                  onClick={() => handleSort('state_ranks_count')}
                >
                  <span className="flex items-center justify-end gap-1">
                    State Ranks <SortIcon field="state_ranks_count" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">First in Course</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[1, 2, 0.5, 0.3, 0.6, 0.4, 1.2].map((w, j) => (
                        <td key={j} className={`px-4 py-3 ${j > 3 ? 'hidden md:table-cell' : ''}`}>
                          <div className="skeleton h-4 rounded" style={{ width: `${w * 60}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.map(course => (
                    <tr key={course.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <RankBadge rank={course.rank} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="font-semibold text-text-primary group-hover:text-primary-light transition-colors"
                        >
                          {course.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {course.category && (
                          <span className={`badge text-xs ${categoryColours[course.category] ?? 'badge'}`}>
                            {course.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-text-muted hidden sm:table-cell">
                        {course.units}u
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-emerald-400 font-mono">
                          {course.total_b6.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {course.state_ranks_count > 0 ? (
                          <span className="text-cyan-400 font-mono">{course.state_ranks_count}</span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {course.first_in_course_student_name ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Crown size={11} className="text-yellow-400 shrink-0" />
                            <span className="text-text-secondary">
                              {course.first_in_course_student_name}
                              {course.first_in_course_school_name && (
                                <span className="text-text-muted"> · {course.first_in_course_school_name}</span>
                              )}
                            </span>
                          </div>
                        ) : <span className="text-text-muted text-xs">—</span>}
                      </td>
                    </tr>
                  ))
              }
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    No courses found for {year} with the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-text-muted text-xs mt-6">
        Data sourced from NESA Distinguished Achievers lists. Only courses with recorded Band 6/E4 results shown.
      </p>
    </div>
  )
}
