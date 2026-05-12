import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const revalidate = 3600

// Returns all courses with scaling data for ALL years — for the live ATAR calculator
export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('scaling_data')
      .select(`
        course_id,
        year,
        slope,
        intercept,
        mean_raw,
        mean_scaled,
        band6_cutoff,
        courses (id, name, slug, category, units, is_extension)
      `)
      .order('year', { ascending: true })

    if (error) throw error

    // Group by course — build a map of courseId → { courseInfo, scaling: { year: {...} } }
    const courseMap: Record<string, {
      id: string; name: string; slug: string; category: string | null;
      units: number; is_extension: boolean;
      scaling: Record<number, { slope: number; intercept: number; mean_raw: number; mean_scaled: number; band6_cutoff: number }>
    }> = {}

    for (const row of (data ?? [])) {
      const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
      if (!course) continue
      if (!courseMap[course.id]) {
        courseMap[course.id] = {
          id: course.id, name: course.name, slug: course.slug,
          category: course.category, units: course.units, is_extension: course.is_extension,
          scaling: {},
        }
      }
      courseMap[course.id].scaling[row.year] = {
        slope: row.slope, intercept: row.intercept,
        mean_raw: row.mean_raw, mean_scaled: row.mean_scaled, band6_cutoff: row.band6_cutoff,
      }
    }

    const subjects = Object.values(courseMap).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(subjects)
  } catch (err) {
    console.error('[atar/subjects]', err)
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 })
  }
}
