'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { User, Crown, ArrowLeft, Star, Award, Calendar } from 'lucide-react'
import AllRounderBadge from '@/components/AllRounderBadge'
import type { HonourRollEntryFull } from '@/lib/types'

function studentName(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function StudentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [entries, setEntries] = useState<HonourRollEntryFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/students/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setEntries(Array.isArray(data) ? data : [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <div className="skeleton h-8 w-48 rounded" />
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton h-64 rounded-xl mt-4" />
    </div>
  )

  if (error || entries.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center">
      <p className="text-text-muted">{error ?? 'Student not found'}</p>
      <Link href="/search" className="text-primary-light hover:underline mt-2 inline-flex items-center gap-1 text-sm">
        <ArrowLeft size={14} /> Back to search
      </Link>
    </div>
  )

  // Derive display name from first entry
  const displayName = `${entries[0].student_first_name} ${entries[0].student_last_name}`

  // Group by year
  const byYear: Record<number, HonourRollEntryFull[]> = {}
  for (const e of entries) {
    if (!byYear[e.year]) byYear[e.year] = []
    byYear[e.year].push(e)
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  // Stats
  const totalB6     = entries.length
  const stateRanks  = entries.filter(e => e.state_rank != null)
  const isAllRounder = entries.some(e => e.is_all_rounder)
  const isFirstInCourse = entries.some(e => e.is_first_in_course)

  // Unique schools
  const schoolMap: Record<string, { name: string; slug: string }> = {}
  for (const e of entries) {
    if (!schoolMap[e.school_slug]) schoolMap[e.school_slug] = { name: e.school_name, slug: e.school_slug }
  }
  const schools = Object.values(schoolMap)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/search" className="inline-flex items-center gap-1 text-text-muted hover:text-text-primary text-sm mb-6 transition-colors">
        <ArrowLeft size={14} /> Search
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
          <User size={24} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-text-primary">{displayName}</h1>
            {isAllRounder && <AllRounderBadge size="sm" />}
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-text-muted">
            {schools.map(s => (
              <Link key={s.slug} href={`/schools/${s.slug}`} className="hover:text-primary-light transition-colors">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Star size={12} /> Band 6 Results
          </div>
          <div className="text-2xl font-black text-emerald-400">{totalB6}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Award size={12} /> State Ranks
          </div>
          <div className="text-2xl font-black text-yellow-400">{stateRanks.length}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Calendar size={12} /> Years Active
          </div>
          <div className="text-2xl font-black text-cyan-400">{years.length}</div>
        </div>
      </div>

      {/* Results by year */}
      <div className="space-y-6">
        {years.map(year => (
          <div key={year} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg-elevated flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">{year} HSC</h2>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Link href={`/schools/${byYear[year][0].school_slug}`} className="hover:text-primary-light transition-colors">
                  {byYear[year][0].school_name}
                </Link>
                {byYear[year].some(e => e.is_all_rounder) && (
                  <AllRounderBadge size="sm" />
                )}
              </div>
            </div>
            <div className="divide-y divide-border">
              {byYear[year].map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/courses/${e.course_slug}`}
                      className="text-text-primary hover:text-primary-light transition-colors font-medium flex items-center gap-1.5"
                    >
                      {e.is_first_in_course && <Crown size={13} className="text-yellow-400 shrink-0" />}
                      {e.course_name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.state_rank != null && (
                      <span className="badge badge-state text-xs">State Rank #{e.state_rank}</span>
                    )}
                    <span className="bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 text-xs text-emerald-400 font-medium">
                      Band 6
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
