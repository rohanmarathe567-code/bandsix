import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { CourseFilters } from '@/lib/types'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const filters: CourseFilters = {
    year:     parseInt(searchParams.get('year') ?? '2025'),
    category: searchParams.get('category') ?? 'all',
    search:   searchParams.get('search') ?? '',
    sort_by:  (searchParams.get('sort_by') ?? 'total_b6') as CourseFilters['sort_by'],
    sort_dir: (searchParams.get('sort_dir') ?? 'desc') as CourseFilters['sort_dir'],
  }

  try {
    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('v_course_rankings')
      .select('*', { count: 'exact' })
      .eq('year', filters.year)

    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const sortColumn = filters.sort_by === 'rank' ? 'rank' : filters.sort_by ?? 'total_b6'
    const ascending  = filters.sort_dir === 'asc'
    query = query.order(sortColumn, { ascending }).limit(2000)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      data:  data ?? [],
      total: count ?? 0,
    })
  } catch (err) {
    console.error('[honour-roll/courses]', err)
    return NextResponse.json({ error: 'Failed to fetch course rankings' }, { status: 500 })
  }
}
