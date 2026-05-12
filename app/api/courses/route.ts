import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const limit  = parseInt(searchParams.get('limit') ?? '200')
  const withScaling = searchParams.get('with_scaling') === '1'

  try {
    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('courses')
      .select(withScaling ? 'id, name, slug, category, units, is_extension' : 'id, name, slug, category, units, is_extension')
      .order('name')
      .limit(limit)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[courses]', err)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}
