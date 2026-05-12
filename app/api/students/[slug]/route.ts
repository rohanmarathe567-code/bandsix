import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const words = params.slug.split('-')

  // Try every possible first/last name split from the slug
  const conditions = []
  for (let i = 1; i < words.length; i++) {
    const first = words.slice(0, i).join(' ')
    const last  = words.slice(i).join(' ')
    conditions.push(`and(student_first_name.ilike.${first},student_last_name.ilike.${last})`)
  }

  if (conditions.length === 0) {
    return NextResponse.json([])
  }

  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('v_honour_roll')
      .select('*')
      .or(conditions.join(','))
      .order('year', { ascending: false })
      .order('course_name')

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[students/slug]', err)
    return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 })
  }
}
