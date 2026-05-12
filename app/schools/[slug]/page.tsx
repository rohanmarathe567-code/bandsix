'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Building2, Star, Award, TrendingUp, Filter, Crown,
  ChevronRight, Users, BookOpen, ArrowLeft, Search
} from 'lucide-react'
import TrendChart from '@/components/TrendChart'
import AllRounderBadge from '@/components/AllRounderBadge'
import { SCHOOL_TYPE_LABELS, SCHOOL_TYPE_COLOURS } from '@/lib/utils'
import type { School, SchoolYearlyStats, HonourRollEntryFull, SchoolType } from '@/lib/types'

interface SchoolData {
  school: School
  yearly_stats: SchoolYearlyStats[]
  entries: HonourRollEntryFull[]
  top_courses: { id: string; name: string; slug: string; category?: string; count: number }[]
  available_years: number[]
}

type TabType = 'students' | 'courses' | 'trend'
type FilterType = 'all' | 'allrounders' | 'staterank'

const RECENT_YEARS = [2025, 2024, 2023, 2022, 2021, 2020]

export default function SchoolPage() {
  const { slug } = useParams<{ slug: string }>()
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null)
  const [year, setYear]             = useState(2025)
  const [tab, setTab]               = useState<TabType>('students')
  const [filter, setFilter]         = useState<FilterType>('all')
  const [courseFilter, setCourseFilter] = useState<string>('')
  const [nameSearch, setNameSearch]     = useState<string>('')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    const filterParam = courseFilter ? `course:${courseFilter}` :
                        filter === 'allrounders' ? 'allrounders' :
                        filter === 'staterank'   ? 'staterank' : 'all'

    fetch(`/api/schools/${slug}?year=${year}&filter=${filterParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setSchoolData(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, year, filter, courseFilter])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-4 w-40 rounded" />
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl mt-4" />
      </div>
    </div>
  )

  if (error || !schoolData) return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-center">
      <p className="text-text-muted">{error ?? 'School not found'}</p>
      <Link href="/honour-roll/schools" className="text-primary-light hover:underline mt-2 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to rankings
      </Link>
    </div>
  )

  const { school, yearly_stats, entries, top_courses, available_years } = schoolData
  const currentStats = yearly_stats.find(s => s.year === year)

  const trendData = yearly_stats.map(s => ({ year: s.year, value: s.total_b6 }))

  // Group entries by student
  const studentMap: Record<string, { name: string; courses: HonourRollEntryFull[]; is_all_rounder: boolean; state_ranks: number[] }> = {}
  for (const e of entries) {
    const key = `${e.student_first_name}|${e.student_last_name}`
    if (!studentMap[key]) {
      studentMap[key] = {
        name: `${e.student_first_name} ${e.student_last_name}`,
        courses: [],
        is_all_rounder: false,
        state_ranks: [],
      }
    }
    studentMap[key].courses.push(e)
    if (e.is_all_rounder) studentMap[key].is_all_rounder = true
    if (e.state_rank != null) studentMap[key].state_ranks.push(e.state_rank)
  }
  const allStudents = Object.values(studentMap).sort((a, b) => a.name.localeCompare(b.name))
  const students = nameSearch.trim()
    ? allStudents.filter(s => s.name.toLowerCase().includes(nameSearch.toLowerCase()))
    : allStudents

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link href="/honour-roll/schools" className="inline-flex items-center gap-1 text-text-muted hover:text-text-primary text-sm mb-6 transition-colors">
        <ArrowLeft size={14} /> School Rankings
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center shrink-0">
          <Building2 size={24} className="text-primary-light" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-text-primary">{school.name}</h1>
            {school.type && (
              <span className={`badge ${SCHOOL_TYPE_COLOURS[school.type as SchoolType]}`}>
                {SCHOOL_TYPE_LABELS[school.type]}
              </span>
            )}
          </div>
          <p className="text-text-secondary text-sm">NSW HSC Distinguished Achievers</p>
        </div>

        {/* Year tabs */}
        <div className="flex gap-1 flex-wrap">
          {(available_years.length > 0 ? available_years.slice(0, 7) : RECENT_YEARS).map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                year === y
                  ? 'bg-primary/20 text-primary-light border border-primary/30'
                  : 'text-text-secondary hover:text-text-primary border border-border hover:border-border-strong'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Star,     label: 'Band 6 Results',  value: currentStats?.total_b6 ?? 0,            colour: 'text-emerald-400' },
          { icon: Users,    label: 'Unique Students',  value: currentStats?.unique_students ?? 0,     colour: 'text-cyan-400' },
          { icon: Award,    label: 'State Ranks',      value: currentStats?.state_ranks_count ?? 0,   colour: 'text-yellow-400' },
          { icon: TrendingUp, label: 'All-rounders',   value: currentStats?.all_rounders_count ?? 0,  colour: 'text-violet-400' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <stat.icon size={12} />
              {stat.label}
            </div>
            <div className={`text-2xl font-black ${stat.colour}`}>
              {stat.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="tab-nav mb-6 w-fit">
        {(['students', 'courses', 'trend'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
          >
            {t === 'students' ? 'Students' : t === 'courses' ? 'Courses' : 'Trend'}
          </button>
        ))}
      </div>

      {/* Students tab */}
      {tab === 'students' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Name search */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search student name…"
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                className="bg-bg-elevated border border-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none w-48"
              />
            </div>
            {(['all', 'allrounders', 'staterank'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setCourseFilter('') }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  filter === f && !courseFilter
                    ? 'bg-primary/15 border-primary/30 text-primary-light'
                    : 'border-border text-text-secondary hover:text-text-primary hover:border-border-strong'
                }`}
              >
                {f === 'all' ? 'All Students' : f === 'allrounders' ? '⭐ All-rounders' : '🏅 State Ranks'}
              </button>
            ))}
            <div className="relative">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <select
                value={courseFilter}
                onChange={e => { setCourseFilter(e.target.value); setFilter('all') }}
                className="bg-bg-elevated border border-border rounded-lg pl-7 pr-3 py-1.5 text-sm text-text-secondary focus:border-primary focus:outline-none"
              >
                <option value="">Filter by course…</option>
                {top_courses.map(c => (
                  <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Students list */}
          {students.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              No students match the current filters for {year}.
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student, i) => (
                <div key={i} className="bg-bg-card border border-border rounded-xl px-4 py-3 hover:border-border-strong transition-colors">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Link
                      href={`/students/${student.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="font-semibold text-text-primary hover:text-primary-light transition-colors"
                    >
                      {student.name}
                    </Link>
                    {student.is_all_rounder && <AllRounderBadge size="sm" />}
                    {student.state_ranks.map(r => (
                      <span key={r} className="badge badge-state text-xs">
                        State Rank #{r}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {student.courses.map((c, j) => (
                      <div key={j} className="flex items-center gap-1">
                        <Link
                          href={`/courses/${c.course_slug}`}
                          className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs text-emerald-400 transition-colors"
                        >
                          {c.is_first_in_course && <Crown size={9} className="text-yellow-400" />}
                          {c.course_name}
                          {c.state_rank != null && <span className="text-yellow-400 ml-1">#{c.state_rank}</span>}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Courses tab */}
      {tab === 'courses' && (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Course</th>
                <th className="px-4 py-3 text-center font-medium">B6 Count</th>
                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {top_courses.map((c, i) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/courses/${c.slug}`} className="text-text-primary hover:text-primary-light transition-colors font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-emerald-400">{c.count}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <Link href={`/courses/${c.slug}`} className="text-text-muted hover:text-primary-light text-xs flex items-center gap-0.5 justify-end">
                      View <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trend tab */}
      {tab === 'trend' && (
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary-light" />
            Band 6 count over all years
          </h3>
          {trendData.length > 1 ? (
            <TrendChart data={trendData} label="Band 6 Count" color="#3b82f6" height={280} />
          ) : (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">
              Not enough data for a trend chart.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
