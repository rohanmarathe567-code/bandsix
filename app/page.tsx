import Link from 'next/link'
import { Trophy, Calculator, Search, ArrowRight, Award, BookOpen, TrendingUp, GitCompare, ChevronRight, Medal } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface TopSchool {
  name: string
  total_b6: number
  slug: string
}

interface TrendingSchool {
  name: string
  slug: string
  type: string
  total_b6: number
  prev_b6: number
  delta: number
  pct: number
}

async function getHomeData() {
  try {
    const supabase = createServerSupabaseClient()
    const [schoolsRes, coursesRes, entriesRes, topSchoolsRes, curr25Res, curr24Res] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('honour_roll_entries').select('id', { count: 'exact', head: true }),
      supabase
        .from('v_school_rankings')
        .select('name, total_b6, slug')
        .eq('year', 2025)
        .order('total_b6', { ascending: false })
        .limit(5),
      supabase
        .from('v_school_rankings')
        .select('id, name, slug, type, total_b6')
        .eq('year', 2025)
        .gte('total_b6', 10),
      supabase
        .from('v_school_rankings')
        .select('id, total_b6')
        .eq('year', 2024),
    ])

    // Compute trending: biggest absolute Band 6 gain 2024 -> 2025
    const prev24Map = new Map<string, number>((curr24Res.data ?? []).map(s => [s.id, s.total_b6]))
    const trending: TrendingSchool[] = (curr25Res.data ?? [])
      .map(s => {
        const prev = prev24Map.get(s.id) ?? 0
        const delta = s.total_b6 - prev
        const pct   = prev > 0 ? Math.round((delta / prev) * 100) : 0
        return { name: s.name, slug: s.slug, type: s.type, total_b6: s.total_b6, prev_b6: prev, delta, pct }
      })
      .filter(s => s.prev_b6 > 0 && s.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5)

    return {
      schools:    schoolsRes.count ?? 0,
      courses:    coursesRes.count ?? 0,
      entries:    entriesRes.count ?? 0,
      topSchools: (topSchoolsRes.data ?? []) as TopSchool[],
      trending,
    }
  } catch {
    return { schools: 900, courses: 180, entries: 600000, topSchools: [], trending: [] }
  }
}

const features = [
  {
    icon: Trophy,
    href: '/honour-roll/schools',
    title: 'School Rankings',
    desc: 'See which NSW schools lead in Band 6/E4 results. Sortable, filterable, with trend charts.',
    iconColour: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
  },
  {
    icon: BookOpen,
    href: '/honour-roll/courses',
    title: 'Course Rankings',
    desc: 'Explore every HSC course: total Band 6s, state rankers, and first-in-course winners.',
    iconColour: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: Calculator,
    href: '/atar-calculator',
    title: 'ATAR Calculator',
    desc: 'Enter your HSC marks, get an estimated ATAR range with scaled mark breakdowns, school context, and impact analysis.',
    iconColour: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
  },
  {
    icon: Medal,
    href: '/state-ranks',
    title: 'State Rankers',
    desc: 'Every student who placed in the top 50 statewide in their course. Filter by year, school, or subject.',
    iconColour: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
  },
  {
    icon: GitCompare,
    href: '/compare',
    title: 'Compare Schools',
    desc: 'Pick up to 3 schools and see a side-by-side breakdown of Band 6s, state ranks, and trends.',
    iconColour: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
  },
  {
    icon: Search,
    href: '/search',
    title: 'Search Everything',
    desc: 'Instantly find any school, course, or student from across all NSW HSC years.',
    iconColour: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
]

export default async function HomePage() {
  const data = await getHomeData()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-16 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: headline */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
                NSW HSC Results, 2016–2025
              </p>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-5 leading-[1.1]">
                <span className="gradient-text">BandSix</span>
              </h1>
              <p className="text-xl text-text-secondary leading-relaxed mb-8">
                Every Distinguished Achiever from 2016 to 2025. School rankings, course breakdowns, state ranks, and an ATAR calculator. All in one place.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/honour-roll/schools"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
                >
                  <Trophy size={16} />
                  School Rankings
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/atar-calculator"
                  className="inline-flex items-center gap-2 bg-bg-elevated hover:bg-bg-card text-text-primary font-semibold px-5 py-2.5 rounded-lg border border-border hover:border-border-strong transition-all text-sm"
                >
                  <Calculator size={16} />
                  ATAR Calculator
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary font-medium px-5 py-2.5 rounded-lg border border-transparent hover:border-border transition-all text-sm"
                >
                  <Search size={16} />
                  Search
                </Link>
              </div>
            </div>

            {/* Right: live top schools snapshot */}
            {data.topSchools.length > 0 && (
              <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-text-primary">Top Schools</span>
                    <span className="text-xs text-text-muted ml-2">2025 HSC</span>
                  </div>
                  <Link href="/honour-roll/schools" className="text-xs text-primary-light hover:text-primary transition-colors flex items-center gap-0.5">
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {data.topSchools.map((school, i) => (
                    <Link
                      key={school.slug}
                      href={`/schools/${school.slug}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-bg-elevated transition-colors group"
                    >
                      <span className={`text-sm font-bold w-5 shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-text-muted'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-text-primary group-hover:text-primary-light transition-colors flex-1 truncate">
                        {school.name}
                      </span>
                      <span className="text-sm font-semibold text-text-secondary tabular-nums">
                        {school.total_b6.toLocaleString()}
                        <span className="text-xs text-text-muted font-normal ml-1">Band 6s</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Schools on the Rise */}
      {data.trending.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-text-primary">Schools on the Rise</h2>
                <span className="text-xs text-text-muted">Biggest Band 6 gains 2024 to 2025</span>
              </div>
              <Link href="/honour-roll/schools" className="text-xs text-primary-light hover:text-primary transition-colors flex items-center gap-0.5">
                All schools <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {data.trending.map((s, i) => (
                <Link
                  key={s.slug}
                  href={`/schools/${s.slug}`}
                  className="bg-bg-card border border-border rounded-xl p-4 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-text-muted">#{i + 1}</span>
                    <span className="text-xs font-bold text-emerald-400">+{s.delta}</span>
                  </div>
                  <p className="text-xs font-semibold text-text-primary group-hover:text-emerald-400 transition-colors leading-snug line-clamp-2 mb-2">
                    {s.name}
                  </p>
                  <div className="text-[10px] text-text-muted">
                    {s.prev_b6} <span className="text-text-muted">to</span>{' '}
                    <span className="text-emerald-400 font-semibold">{s.total_b6}</span> Band 6s
                    {s.pct > 0 && <span className="ml-1 text-emerald-500">+{s.pct}%</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats bar */}
      <section className="border-y border-border bg-bg-surface py-5 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: data.schools > 0 ? data.schools.toLocaleString() + '+' : '900+', label: 'NSW Schools' },
              { value: data.courses > 0 ? data.courses.toLocaleString() + '+' : '180+', label: 'HSC Courses' },
              { value: data.entries > 0 ? (data.entries / 1000).toFixed(0) + 'k+' : '600k+', label: 'Band 6 Records' },
              { value: '10', label: 'Years of Data' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-bold gradient-text-gold">{s.value}</div>
                <div className="text-text-muted text-xs mt-1 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold text-text-primary mb-6">What you can do</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map(f => (
              <Link
                key={f.href}
                href={f.href}
                className="group bg-bg-card border border-border rounded-xl p-5 card-hover transition-all"
              >
                <div className={`w-9 h-9 rounded-lg ${f.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon size={18} className={f.iconColour} />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1.5 group-hover:text-primary-light transition-colors">
                  {f.title}
                </h3>
                <p className="text-text-muted text-xs leading-relaxed">{f.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-text-muted group-hover:text-primary-light transition-colors">
                  Explore <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* What is Band 6 */}
      <section className="py-12 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Award size={18} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">What is a Band 6 / E4?</h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  A <strong className="text-text-secondary">Band 6</strong> (or <strong className="text-text-secondary">E4</strong> for Extension courses) is the highest performance band in the NSW HSC,
                  awarded to students who score <strong className="text-text-secondary">90 or above</strong>.
                  All-round Achievers achieved a Band 6 or E4 in <strong className="text-text-secondary">10 or more units</strong>.
                  State Rankers placed in the <strong className="text-text-secondary">top 50 statewide</strong> in their course.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge badge-band6">Band 6 ≥ 90</span>
                  <span className="badge badge-state">State Rank (Top 50)</span>
                  <span className="badge badge-allround">All-rounder (10+ units)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="border border-border rounded-xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="text-primary-light" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Ready to explore?</p>
                <p className="text-xs text-text-muted">Search for your school, course, or calculate your ATAR.</p>
              </div>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm shrink-0"
            >
              <Search size={15} />
              Start searching
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
