import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const schoolId   = searchParams.get('school_id') ?? ''
  const courseIds  = (searchParams.get('course_ids') ?? '').split(',').filter(Boolean)

  if (!schoolId) return NextResponse.json({ error: 'school_id required' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()

    const [schoolRes, statsRes, entriesRes] = await Promise.all([
      supabase.from('schools').select('id, name, type, slug').eq('id', schoolId).single(),
      supabase
        .from('v_school_rankings')
        .select('year, total_b6, unique_students, state_ranks_count, all_rounders_count, rank')
        .eq('id', schoolId)
        .order('year', { ascending: false })
        .limit(5),
      courseIds.length > 0
        ? supabase
            .from('honour_roll_entries')
            .select('course_id, year')
            .eq('school_id', schoolId)
            .in('course_id', courseIds)
        : Promise.resolve({ data: [] as { course_id: string; year: number }[], error: null }),
    ])

    if (schoolRes.error) throw schoolRes.error

    // Group entries: courseId -> year(string) -> count
    const courseStats: Record<string, Record<string, number>> = {}
    for (const row of (entriesRes.data ?? [])) {
      if (!courseStats[row.course_id]) courseStats[row.course_id] = {}
      const yr = String(row.year)
      courseStats[row.course_id][yr] = (courseStats[row.course_id][yr] ?? 0) + 1
    }

    return NextResponse.json({
      school:       schoolRes.data,
      yearly_stats: statsRes.data ?? [],
      course_stats: courseStats,
    })
  } catch (err) {
    console.error('[atar/school-context]', err)
    return NextResponse.json({ error: 'Failed to fetch school context' }, { status: 500 })
  }
}
