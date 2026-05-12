import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const revalidate = 3600

// Global site-wide stats for home page
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const [schoolsRes, coursesRes, entriesRes] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('honour_roll_entries').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      total_schools:  schoolsRes.count  ?? 0,
      total_courses:  coursesRes.count  ?? 0,
      total_entries:  entriesRes.count  ?? 0,
      years_covered:  26, // 2000–2025
    })
  } catch (err) {
    console.error('[stats]', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
