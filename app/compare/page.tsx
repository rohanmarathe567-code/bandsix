'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { GitCompare, X, Search, Plus, Star, Award, Users, TrendingUp } from 'lucide-react'
import MultiTrendChart from '@/components/MultiTrendChart'
import type { SchoolYearlyStats } from '@/lib/types'

const COLORS = ['#3b82f6', '#f59e0b', '#10b981']

interface SchoolOption { id: string; name: string; slug: string }
interface SchoolData {
  school: { name: string; slug: string; type: string }
  yearly_stats: SchoolYearlyStats[]
  top_courses: { name: string; slug: string; count: number }[]
  available_years: number[]
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 text-center">
      <div className="flex items-center justify-center gap-1 text-text-muted text-xs mb-1">
        <Icon size={11} />{label}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
    </div>
  )
}

export default function ComparePage() {
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState<SchoolOption[]>([])
  const [selected, setSelected]     = useState<SchoolOption[]>([])
  const [schoolData, setSchoolData] = useState<Record<string, SchoolData>>({})
  const [year, setYear]             = useState(2025)
  const [loading, setLoading]       = useState<Record<string, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Search for schools
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`)
      const data = await res.json()
      setSuggestions((Array.isArray(data) ? data : []).filter((r: { type: string }) => r.type === 'school'))
    }, 200)
  }, [query])

  // Fetch school data when a school is added or year changes
  useEffect(() => {
    for (const s of selected) {
      if (!schoolData[s.slug] || (schoolData[s.slug] as SchoolData & { _year?: number })._year !== year) {
        setLoading(l => ({ ...l, [s.slug]: true }))
        fetch(`/api/schools/${s.slug}?year=${year}`)
          .then(r => r.json())
          .then(data => setSchoolData(d => ({ ...d, [s.slug]: { ...data, _year: year } })))
          .finally(() => setLoading(l => ({ ...l, [s.slug]: false })))
      }
    }
  }, [selected, year]) // eslint-disable-line react-hooks/exhaustive-deps

  const addSchool = (school: SchoolOption) => {
    if (selected.length >= 3 || selected.find(s => s.slug === school.slug)) return
    setSelected(s => [...s, school])
    setQuery('')
    setSuggestions([])
  }

  const removeSchool = (slug: string) => {
    setSelected(s => s.filter(x => x.slug !== slug))
    setSchoolData(d => { const nd = { ...d }; delete nd[slug]; return nd })
  }

  // Build trend series for each school
  const trendSeries = selected
    .filter(s => schoolData[s.slug]?.yearly_stats?.length)
    .map((s, i) => ({
      label: schoolData[s.slug].school.name,
      color: COLORS[i],
      data: schoolData[s.slug].yearly_stats.map(ys => ({ year: ys.year, value: ys.total_b6 })),
    }))

  // Available years (union of all selected schools)
  const allYears = Array.from(new Set(
    selected.flatMap(s => schoolData[s.slug]?.available_years ?? [])
  )).sort((a, b) => b - a).slice(0, 7)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <GitCompare size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-primary">School Comparison</h1>
            <p className="text-text-secondary text-sm">Compare up to 3 NSW schools side by side</p>
          </div>
        </div>
      </div>

      {/* School search */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((s, i) => (
            <div
              key={s.slug}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border"
              style={{ borderColor: COLORS[i] + '60', backgroundColor: COLORS[i] + '15', color: COLORS[i] }}
            >
              {s.name}
              <button onClick={() => removeSchool(s.slug)} className="hover:opacity-70 transition-opacity">
                <X size={13} />
              </button>
            </div>
          ))}
          {selected.length < 3 && (
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={selected.length === 0 ? 'Search for a school to compare…' : 'Add another school…'}
                className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border rounded-xl shadow-2xl z-10 overflow-hidden">
                  {suggestions.map(s => (
                    <button
                      key={s.slug}
                      onClick={() => addSchool(s)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors text-left"
                    >
                      <Plus size={13} className="shrink-0" />
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {selected.length > 0 && allYears.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-2 border-t border-border">
            {allYears.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  year === y
                    ? 'bg-primary/20 text-primary-light border border-primary/30'
                    : 'text-text-secondary border border-border hover:border-border-strong'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <div className="text-center py-24 text-text-muted">
          <GitCompare size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">No schools selected</p>
          <p className="text-sm">Search above and add up to 3 schools to compare.</p>
        </div>
      )}

      {/* Side by side stats */}
      {selected.length > 0 && (
        <>
          <div
            className="grid gap-6 mb-8"
            style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}
          >
            {selected.map((s, i) => {
              const data = schoolData[s.slug]
              const stats = data?.yearly_stats?.find(ys => ys.year === year)
              const isLoading = loading[s.slug]
              return (
                <div key={s.slug} className="space-y-4">
                  {/* School header */}
                  <div
                    className="rounded-2xl p-4 border"
                    style={{ borderColor: COLORS[i] + '40', backgroundColor: COLORS[i] + '0d' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <Link
                        href={`/schools/${s.slug}`}
                        className="font-bold text-text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                    </div>
                    <p className="text-text-muted text-xs ml-5">{year} results</p>
                  </div>

                  {/* Stats */}
                  {isLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, j) => <div key={j} className="skeleton h-16 rounded-xl" />)}
                    </div>
                  ) : stats ? (
                    <div className="space-y-2">
                      <StatCard label="Band 6 Results"   value={stats.total_b6.toLocaleString()}        color="text-emerald-400"  icon={Star} />
                      <StatCard label="Unique Students"  value={stats.unique_students.toLocaleString()}  color="text-cyan-400"     icon={Users} />
                      <StatCard label="State Ranks"      value={stats.state_ranks_count}                 color="text-yellow-400"   icon={Award} />
                      <StatCard label="All-rounders"     value={stats.all_rounders_count}                color="text-violet-400"   icon={TrendingUp} />
                    </div>
                  ) : (
                    <div className="bg-bg-card border border-border rounded-xl p-4 text-center text-text-muted text-sm">
                      No data for {year}
                    </div>
                  )}

                  {/* Top courses */}
                  {!isLoading && data?.top_courses?.length > 0 && (
                    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                      <div className="px-3 py-2 border-b border-border text-xs font-semibold text-text-muted">
                        Top Courses ({year})
                      </div>
                      <div className="divide-y divide-border">
                        {data.top_courses.slice(0, 8).map(c => (
                          <div key={c.slug} className="flex items-center justify-between px-3 py-2">
                            <Link
                              href={`/courses/${c.slug}`}
                              className="text-xs text-text-secondary hover:text-primary-light transition-colors truncate flex-1"
                            >
                              {c.name}
                            </Link>
                            <span className="text-xs font-bold text-emerald-400 ml-2 shrink-0">{c.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Trend chart */}
          {trendSeries.length > 0 && (
            <div className="bg-bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-violet-400" />
                Band 6 count comparison, all years
              </h3>
              <MultiTrendChart series={trendSeries} height={300} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
