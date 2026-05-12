import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = req.nextUrl
  const year   = parseInt(searchParams.get('year') ?? '2025')
  const filter = searchParams.get('filter') ?? 'all' // all | allrounders | staterank | course:<slug>

  try {
    const supabase = createServerSupabaseClient()

    // Fetch school details
    const { data: school, error: schoolErr } = await supabase
      .from('schools')
      .select('*')
      .eq('slug', params.slug)
      .single()

    if (schoolErr || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Fetch yearly stats (all years for trend chart)
    const { data: yearlyStats } = await supabase
      .from('school_yearly_stats')
      .select('*')
      .eq('school_id', school.id)
      .order('year', { ascending: true })

    // Fetch honour roll entries for the selected year
    let entriesQuery = supabase
      .from('v_honour_roll')
      .select('*')
      .eq('school_id', school.id)
      .eq('year', year)
      .order('course_name')
      .order('student_last_name')

    if (filter === 'allrounders') {
      entriesQuery = entriesQuery.eq('is_all_rounder', true)
    } else if (filter === 'staterank') {
      entriesQuery = entriesQuery.not('state_rank', 'is', null)
    } else if (filter.startsWith('course:')) {
      const courseSlug = filter.slice(7)
      entriesQuery = entriesQuery.eq('course_slug', courseSlug)
    }

    const { data: entries, error: entriesErr } = await entriesQuery
    if (entriesErr) throw entriesErr

    // Course performance: which courses does this school dominate?
    const { data: coursePerf } = await supabase
      .from('v_honour_roll')
      .select('course_id, course_name, course_slug, course_category')
      .eq('school_id', school.id)
      .eq('year', year)

    const courseCounts: Record<string, { id: string; name: string; slug: string; category?: string; count: number }> = {}
    for (const e of coursePerf ?? []) {
      if (!courseCounts[e.course_id]) {
        courseCounts[e.course_id] = { id: e.course_id, name: e.course_name, slug: e.course_slug, category: e.course_category, count: 0 }
      }
      courseCounts[e.course_id].count++
    }
    const topCourses = Object.values(courseCounts).sort((a, b) => b.count - a.count).slice(0, 20)

    // Years that have data for this school
    const availableYears = (yearlyStats ?? []).map(s => s.year).sort((a, b) => b - a)

    return NextResponse.json({
      school,
      yearly_stats:    yearlyStats ?? [],
      entries:         entries ?? [],
      top_courses:     topCourses,
      available_years: availableYears,
    })
  } catch (err) {
    console.error('[schools/slug]', err)
    return NextResponse.json({ error: 'Failed to fetch school data' }, { status: 500 })
  }
}
