import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const revalidate = 3600

// Returns all schools (for dropdowns) — with optional search
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? ''
  const limit  = parseInt(searchParams.get('limit') ?? '100')

  try {
    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('schools')
      .select('id, name, type, slug')
      .order('name')
      .limit(limit)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[schools]', err)
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}
