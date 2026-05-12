'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, Building2, BookOpen, ArrowRight, Loader2, User } from 'lucide-react'
import type { SearchResult } from '@/lib/types'
import { SCHOOL_TYPE_LABELS, SCHOOL_TYPE_COLOURS } from '@/lib/utils'

const POPULAR_SEARCHES = [
  'James Ruse',
  'Sydney Grammar',
  'Mathematics Advanced',
  'English Advanced',
  'Normanhurst',
  'North Sydney Girls',
  'Physics',
  'Chemistry',
]

export default function SearchPage() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=30`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 200)
  }

  const schools  = results.filter(r => r.type === 'school')
  const courses  = results.filter(r => r.type === 'course')
  const students = results.filter(r => r.type === 'student')

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 mb-4">
          <Search size={24} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black text-text-primary mb-2">Search BandSix</h1>
        <p className="text-text-secondary">Find any NSW school, HSC course, or student instantly.</p>
      </div>

      {/* Search input */}
      <div className="relative mb-8">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search schools, courses, or student names…"
          className="w-full bg-bg-elevated border border-border hover:border-border-strong focus:border-primary rounded-2xl pl-12 pr-12 py-4 text-base text-text-primary placeholder:text-text-muted focus:outline-none transition-colors shadow-card"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Popular searches */}
      {!searched && (
        <div>
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">Popular searches</h3>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); handleChange(s) }}
                className="px-3 py-1.5 bg-bg-elevated hover:bg-bg-card border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <div className="animate-fade-in">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">No results found for &quot;{query}&quot;</div>
              <div className="text-text-muted text-sm">Try searching for a school name or HSC course.</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Schools section */}
              {schools.length > 0 && (
                <div>
                  <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 size={12} /> Schools ({schools.length})
                  </h3>
                  <div className="space-y-2">
                    {schools.map(r => (
                      <Link
                        key={r.id}
                        href={`/schools/${r.slug}`}
                        className="group flex items-center gap-3 bg-bg-card hover:bg-bg-elevated border border-border hover:border-primary/30 rounded-xl px-4 py-3 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                          <Building2 size={15} className="text-text-muted group-hover:text-primary-light transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary font-semibold group-hover:text-primary-light transition-colors truncate">
                            {r.name}
                          </div>
                          {r.extra && (
                            <div className={`inline-flex mt-0.5 badge text-xs ${SCHOOL_TYPE_COLOURS[r.extra as keyof typeof SCHOOL_TYPE_COLOURS] ?? ''}`}>
                              {SCHOOL_TYPE_LABELS[r.extra] ?? r.extra}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={14} className="text-text-muted group-hover:text-primary-light shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Courses section */}
              {courses.length > 0 && (
                <div>
                  <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BookOpen size={12} /> Courses ({courses.length})
                  </h3>
                  <div className="space-y-2">
                    {courses.map(r => (
                      <Link
                        key={r.id}
                        href={`/courses/${r.slug}`}
                        className="group flex items-center gap-3 bg-bg-card hover:bg-bg-elevated border border-border hover:border-primary/30 rounded-xl px-4 py-3 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 group-hover:bg-cyan-500/15 transition-colors">
                          <BookOpen size={15} className="text-text-muted group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary font-semibold group-hover:text-primary-light transition-colors truncate">
                            {r.name}
                          </div>
                          {r.extra && (
                            <div className="text-text-muted text-xs mt-0.5">{r.extra}</div>
                          )}
                        </div>
                        <ArrowRight size={14} className="text-text-muted group-hover:text-primary-light shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Students section */}
              {students.length > 0 && (
                <div>
                  <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={12} /> Students ({students.length})
                  </h3>
                  <div className="space-y-2">
                    {students.map(r => (
                      <Link
                        key={r.id}
                        href={`/students/${r.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="group flex items-center gap-3 bg-bg-card hover:bg-bg-elevated border border-border hover:border-primary/30 rounded-xl px-4 py-3 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                          <User size={15} className="text-text-muted group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary font-semibold group-hover:text-primary-light transition-colors truncate">
                            {r.name}
                          </div>
                          <div className="text-text-muted text-xs mt-0.5 truncate">{r.extra} · {r.year}</div>
                        </div>
                        <ArrowRight size={14} className="text-text-muted group-hover:text-primary-light shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
