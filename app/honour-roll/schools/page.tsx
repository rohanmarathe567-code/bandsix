'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, ChevronUp, ChevronDown, SlidersHorizontal, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import RankBadge from '@/components/RankBadge'
import { SCHOOL_TYPE_LABELS, SCHOOL_TYPE_COLOURS, HSC_YEARS } from '@/lib/utils'
import type { SchoolRanking, SchoolFilters, SchoolType } from '@/lib/types'

type SortField = 'rank' | 'total_b6' | 'unique_students' | 'state_ranks_count' | 'b6_per_student'

interface EnrichedSchool extends SchoolRanking {
  prev_b6: number | null
  b6_delta: number | null
  b6_per_student: number | null
}

export default function SchoolRankingsPage() {
  const [year, setYear]     = useState(2025)
  const [type, setType]     = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('total_b6')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [data, setData]     = useState<EnrichedSchool[]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year:     String(year),
        type:     type,
        search:   search,
        sort_by:  sortBy,
        sort_dir: sortDir,
      })
      const res = await fetch(`/api/honour-roll/schools?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [year, type, search, sortBy, sortDir])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-primary">School Rankings</h1>
            <p className="text-text-secondary text-sm">NSW HSC Honour Roll, by Band 6 / E4 count</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Year */}
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

        {/* School type */}
        <div className="flex items-center gap-2">
          <label className="text-text-muted text-sm">Type:</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {Object.entries(SCHOOL_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search school…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        {/* Results count */}
        <div className="flex items-center text-text-muted text-sm ml-auto">
          <SlidersHorizontal size={13} className="mr-1.5" />
          {loading ? '…' : total.toLocaleString()} schools
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-striped">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium w-16">Rank</th>
                <th className="px-4 py-3 text-left font-medium">School</th>
                <th className="px-4 py-3 text-center font-medium hidden sm:table-cell w-24">Type</th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none hover:text-text-primary w-28"
                  onClick={() => handleSort('total_b6')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Band 6s <SortIcon field="total_b6" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium hidden md:table-cell w-20">
                  <span className="text-text-muted normal-case text-[10px]">vs {year - 1}</span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none hover:text-text-primary hidden lg:table-cell w-28"
                  onClick={() => handleSort('b6_per_student')}
                  title="Average Band 6s per student"
                >
                  <span className="flex items-center justify-end gap-1">
                    B6/Student <SortIcon field="b6_per_student" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer select-none hover:text-text-primary hidden xl:table-cell w-32"
                  onClick={() => handleSort('state_ranks_count')}
                >
                  <span className="flex items-center justify-end gap-1">
                    State Ranks <SortIcon field="state_ranks_count" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[1, 2, 0.5, 0.7, 0.6, 0.5, 0.4].map((w, j) => (
                        <td key={j} className={`px-4 py-3 ${j > 3 ? 'hidden md:table-cell' : ''}`}>
                          <div className="skeleton h-4 rounded" style={{ width: `${w * 100}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.map(school => (
                    <tr key={school.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <RankBadge rank={school.rank} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/schools/${school.slug}`}
                          className="font-semibold text-text-primary group-hover:text-primary-light transition-colors"
                        >
                          {school.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className={`badge text-xs ${SCHOOL_TYPE_COLOURS[school.type as SchoolType] ?? 'badge'}`}>
                          {SCHOOL_TYPE_LABELS[school.type] ?? school.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-emerald-400 font-mono">
                          {school.total_b6.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {school.b6_delta != null ? (
                          school.b6_delta > 0 ? (
                            <span className="flex items-center justify-end gap-0.5 text-xs text-emerald-400 font-mono">
                              <TrendingUp size={11} />{'+' + school.b6_delta}
                            </span>
                          ) : school.b6_delta < 0 ? (
                            <span className="flex items-center justify-end gap-0.5 text-xs text-red-400 font-mono">
                              <TrendingDown size={11} />{school.b6_delta}
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-0.5 text-xs text-text-muted">
                              <Minus size={11} />0
                            </span>
                          )
                        ) : <span className="text-text-muted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {school.b6_per_student != null ? (
                          <span className="text-text-secondary font-mono text-xs">{school.b6_per_student.toFixed(2)}</span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden xl:table-cell">
                        {school.state_ranks_count > 0 ? (
                          <span className="text-cyan-400 font-mono">{school.state_ranks_count}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))
              }
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    No schools found for {year} with the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-text-muted text-xs mt-6">
        Data sourced from NESA Distinguished Achievers lists. Band 6/E4 = mark ≥ 90.
      </p>
    </div>
  )
}
