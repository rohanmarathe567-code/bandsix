import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { SchoolFilters } from '@/lib/types'

export const runtime = 'nodejs'
export const revalidate = 3600 // 1 hour

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2025')
  const filters: SchoolFilters = {
    year,
    type:     (searchParams.get('type') ?? 'all') as SchoolFilters['type'],
    search:   searchParams.get('search') ?? '',
    sort_by:  (searchParams.get('sort_by') ?? 'total_b6') as SchoolFilters['sort_by'],
    sort_dir: (searchParams.get('sort_dir') ?? 'desc') as SchoolFilters['sort_dir'],
  }

  try {
    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('v_school_rankings')
      .select('*', { count: 'exact' })
      .eq('year', year)

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const sortColumn = filters.sort_by === 'rank' ? 'rank' : filters.sort_by ?? 'total_b6'
    const ascending  = filters.sort_dir === 'asc'
    query = query.order(sortColumn, { ascending }).limit(2000)

    const [{ data, error, count }, prevRes] = await Promise.all([
      query,
      supabase
        .from('v_school_rankings')
        .select('id, total_b6')
        .eq('year', year - 1),
    ])
    if (error) throw error

    const prevMap = new Map<string, number>((prevRes.data ?? []).map(s => [s.id, s.total_b6]))
    const enriched = (data ?? []).map(s => ({
      ...s,
      prev_b6: prevMap.get(s.id) ?? null,
      b6_delta: prevMap.has(s.id) ? s.total_b6 - prevMap.get(s.id)! : null,
      b6_per_student: s.unique_students > 0
        ? Math.round((s.total_b6 / s.unique_students) * 100) / 100
        : null,
    }))

    return NextResponse.json({
      data:  enriched,
      total: count ?? 0,
    })
  } catch (err) {
    console.error('[honour-roll/schools]', err)
    return NextResponse.json({ error: 'Failed to fetch school rankings' }, { status: 500 })
  }
}
