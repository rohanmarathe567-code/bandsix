import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2025')

  try {
    const supabase = createServerSupabaseClient()

    // Fetch course details
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', params.slug)
      .single()

    if (courseErr || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Fetch yearly stats for trend chart
    const { data: yearlyStats } = await supabase
      .from('course_yearly_stats')
      .select('*')
      .eq('course_id', course.id)
      .order('year', { ascending: true })

    // Fetch all entries for selected year
    const { data: entries, error: entriesErr } = await supabase
      .from('v_honour_roll')
      .select('*')
      .eq('course_id', course.id)
      .eq('year', year)
      .order('state_rank', { ascending: true, nullsFirst: false })
      .order('school_name')
      .order('student_last_name')

    if (entriesErr) throw entriesErr

    // Top schools for this course (that year)
    const schoolCounts: Record<string, { id: string; name: string; slug: string; count: number }> = {}
    for (const e of entries ?? []) {
      if (!schoolCounts[e.school_id]) {
        schoolCounts[e.school_id] = { id: e.school_id, name: e.school_name, slug: e.school_slug, count: 0 }
      }
      schoolCounts[e.school_id].count++
    }
    const topSchools = Object.values(schoolCounts).sort((a, b) => b.count - a.count).slice(0, 20)

    // First in course winner
    const firstInCourse = (entries ?? []).find(e => e.is_first_in_course) ?? null

    // State rankers
    const stateRankers = (entries ?? []).filter(e => e.state_rank != null).sort((a, b) => (a.state_rank ?? 99) - (b.state_rank ?? 99))

    // Available years
    const availableYears = (yearlyStats ?? []).map(s => s.year).sort((a, b) => b - a)

    return NextResponse.json({
      course,
      yearly_stats:    yearlyStats ?? [],
      entries:         entries ?? [],
      top_schools:     topSchools,
      first_in_course: firstInCourse,
      state_rankers:   stateRankers,
      available_years: availableYears,
    })
  } catch (err) {
    console.error('[courses/slug]', err)
    return NextResponse.json({ error: 'Failed to fetch course data' }, { status: 500 })
  }
}
