'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BookOpen, Crown, Award, TrendingUp, Users, ArrowLeft, School } from 'lucide-react'
import TrendChart from '@/components/TrendChart'
import { HSC_YEARS } from '@/lib/utils'
import type { Course, CourseYearlyStats, HonourRollEntryFull } from '@/lib/types'

interface CourseData {
  course: Course
  yearly_stats: CourseYearlyStats[]
  entries: HonourRollEntryFull[]
  top_schools: { id: string; name: string; slug: string; count: number }[]
  first_in_course: HonourRollEntryFull | null
  state_rankers: HonourRollEntryFull[]
  available_years: number[]
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

export default function CoursePage() {
  const { slug } = useParams<{ slug: string }>()
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [year, setYear]             = useState(2025)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [tab, setTab]               = useState<'students' | 'schools' | 'trend'>('students')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/courses/${slug}?year=${year}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setCourseData(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, year])

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
      <div className="skeleton h-8 w-72 rounded" />
      <div className="skeleton h-4 w-40 rounded" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
      <div className="skeleton h-64 rounded-xl mt-4" />
    </div>
  )

  if (error || !courseData) return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-center">
      <p className="text-text-muted">{error ?? 'Course not found'}</p>
      <Link href="/honour-roll/courses" className="text-primary-light hover:underline mt-2 inline-flex items-center gap-1">
        <ArrowLeft size={14} /> Back to course rankings
      </Link>
    </div>
  )

  const { course, yearly_stats, entries, top_schools, first_in_course, state_rankers, available_years } = courseData
  const currentStats = yearly_stats.find(s => s.year === year)
  const trendData = yearly_stats.map(s => ({ year: s.year, value: s.total_b6 }))

  // Non-state-rank students for display
  const regularStudents = entries.filter(e => e.state_rank == null && !e.is_first_in_course)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back link */}
      <Link href="/honour-roll/courses" className="inline-flex items-center gap-1 text-text-muted hover:text-text-primary text-sm mb-6 transition-colors">
        <ArrowLeft size={14} /> Course Rankings
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center shrink-0">
          <BookOpen size={24} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-text-primary">{course.name}</h1>
            {course.category && (
              <span className={`badge ${categoryColours[course.category] ?? 'badge'}`}>
                {course.category}
              </span>
            )}
            <span className="badge badge-band6">{course.units} units</span>
            {course.is_extension && <span className="badge badge-state">Extension</span>}
          </div>
          <p className="text-text-secondary text-sm">NSW HSC Distinguished Achievers, {year}</p>
        </div>

        {/* Year selector */}
        <div className="flex gap-1 flex-wrap">
          {(available_years.length > 0 ? available_years.slice(0, 7) : [2025,2024,2023,2022,2021,2020]).map(y => (
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Award,      label: 'Band 6/E4s', value: currentStats?.total_b6 ?? 0,           colour: 'text-emerald-400' },
          { icon: Users,      label: 'State Ranks', value: currentStats?.state_ranks_count ?? 0, colour: 'text-cyan-400' },
          { icon: TrendingUp, label: 'Schools',     value: top_schools.length,                   colour: 'text-violet-400' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-1.5 text-text-muted text-xs">
              <stat.icon size={12} />
              {stat.label}
            </div>
            <div className={`text-2xl font-black ${stat.colour}`}>{stat.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* First in course highlight */}
      {first_in_course && (
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/25 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} className="text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">First in Course {year}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-text-primary font-bold text-lg">
              {first_in_course.student_first_name} {first_in_course.student_last_name}
            </span>
            <Link
              href={`/schools/${first_in_course.school_slug}`}
              className="text-text-secondary hover:text-primary-light transition-colors text-sm flex items-center gap-1"
            >
              <School size={13} /> {first_in_course.school_name}
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav mb-6 w-fit">
        {(['students', 'schools', 'trend'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
          >
            {t === 'students' ? 'All Students' : t === 'schools' ? 'Top Schools' : 'Trend'}
          </button>
        ))}
      </div>

      {/* Students tab */}
      {tab === 'students' && (
        <div className="space-y-3">
          {/* State rankers section */}
          {state_rankers.length > 0 && (
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border bg-bg-elevated">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Award size={14} className="text-cyan-400" /> State Rankers ({year})
                </h3>
              </div>
              <div className="divide-y divide-border">
                {state_rankers.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                    <span className="font-mono font-bold text-cyan-400 w-8 text-sm">#{e.state_rank}</span>
                    <Link href={`/students/${`${e.student_first_name} ${e.student_last_name}`.toLowerCase().replace(/\s+/g, '-')}`} className="text-text-primary hover:text-primary-light font-medium text-sm transition-colors">{e.student_first_name} {e.student_last_name}</Link>
                    {e.is_first_in_course && <Crown size={12} className="text-yellow-400" />}
                    <Link href={`/schools/${e.school_slug}`} className="ml-auto text-text-muted hover:text-primary-light text-xs transition-colors">
                      {e.school_name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular students */}
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg-elevated">
              <h3 className="text-sm font-semibold text-text-primary">
                Band 6/E4 Students ({year}), {entries.length} total
              </h3>
            </div>
            <div className="overflow-y-auto max-h-[480px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-bg-card border-b border-border">
                  <tr className="text-text-muted text-xs uppercase tracking-wider">
                    <th className="px-4 py-2 text-left font-medium">Student</th>
                    <th className="px-4 py-2 text-left font-medium">School</th>
                    <th className="px-4 py-2 text-center font-medium hidden sm:table-cell">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((e, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2 font-medium text-text-primary">
                        <div className="flex items-center gap-1.5">
                          {e.is_first_in_course && <Crown size={11} className="text-yellow-400 shrink-0" />}
                          <Link href={`/students/${`${e.student_first_name} ${e.student_last_name}`.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-primary-light transition-colors">
                            {e.student_first_name} {e.student_last_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Link href={`/schools/${e.school_slug}`} className="text-text-secondary hover:text-primary-light text-xs transition-colors">
                          {e.school_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-center hidden sm:table-cell">
                        {e.state_rank != null ? (
                          <span className="badge badge-state text-xs">#{e.state_rank}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schools tab */}
      {tab === 'schools' && (
        <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium w-12">Rank</th>
                <th className="px-4 py-3 text-left font-medium">School</th>
                <th className="px-4 py-3 text-right font-medium w-28">Band 6s</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {top_schools.map((s, i) => (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-text-muted text-sm">#{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/schools/${s.slug}`} className="text-text-primary hover:text-primary-light font-medium transition-colors">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono">{s.count}</td>
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
            <TrendingUp size={14} className="text-cyan-400" />
            Band 6/E4 count over all years
          </h3>
          {trendData.length > 1 ? (
            <TrendChart data={trendData} label="Band 6/E4 Count" color="#3b82f6" height={280} />
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
