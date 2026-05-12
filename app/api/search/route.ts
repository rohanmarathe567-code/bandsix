import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('q') ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  if (query.trim().length < 2) {
    return NextResponse.json([])
  }

  try {
    const supabase = createServerSupabaseClient()

    const [schoolsRes, coursesRes, studentsRes] = await Promise.all([
      supabase
        .from('schools')
        .select('id, name, slug, type')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(limit),
      supabase
        .from('courses')
        .select('id, name, slug, category')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(limit),
      supabase
        .from('honour_roll_entries')
        .select('student_first_name, student_last_name, year, school:schools(name, slug)')
        .or(`student_first_name.ilike.%${query}%,student_last_name.ilike.%${query}%`)
        .order('year', { ascending: false })
        .limit(limit * 4),
    ])

    const schools = (schoolsRes.data ?? []).map(s => ({
      type: 'school' as const,
      id:    s.id,
      name:  s.name,
      slug:  s.slug,
      extra: s.type,
    }))

    const courses = (coursesRes.data ?? []).map(c => ({
      type: 'course' as const,
      id:    c.id,
      name:  c.name,
      slug:  c.slug,
      extra: c.category,
    }))

    // Deduplicate students by full name + school slug (keep most recent year)
    const studentMap = new Map<string, {
      type: 'student',
      id: string,
      name: string,
      slug: string,
      extra: string,
      year: number,
    }>()
    for (const r of (studentsRes.data ?? [])) {
      const school = r.school as unknown as { name: string; slug: string } | null
      if (!school) continue
      const fullName = `${r.student_first_name} ${r.student_last_name}`
      const key = `${fullName}__${school.slug}`
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          type: 'student' as const,
          id:   key,
          name: fullName,
          slug: school.slug,
          extra: school.name,
          year: r.year,
        })
      }
    }
    const students = Array.from(studentMap.values()).slice(0, limit)

    // Interleave schools + courses sorted by relevance
    const schoolCourse = [...schools, ...courses].sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1
      const bStarts = b.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return a.name.localeCompare(b.name)
    }).slice(0, limit)

    return NextResponse.json([...schoolCourse, ...students])
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
