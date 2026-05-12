import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateATAR } from '@/lib/atar'
import type { SubjectEntry, ScalingData } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subjects, year = 2025 }: { subjects: SubjectEntry[]; year?: number } = body

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json({ error: 'No subjects provided' }, { status: 400 })
    }

    if (subjects.length > 15) {
      return NextResponse.json({ error: 'Too many subjects (max 15)' }, { status: 400 })
    }

    // Validate marks
    for (const s of subjects) {
      if (s.hsc_mark < 0 || s.hsc_mark > 100) {
        return NextResponse.json({ error: `Invalid HSC mark for ${s.course_name}` }, { status: 400 })
      }
    }

    const supabase = createServerSupabaseClient()

    // Fetch scaling data for all provided courses
    const courseIds = subjects.map(s => s.course_id)
    const { data: scalingRows, error } = await supabase
      .from('scaling_data')
      .select('*')
      .eq('year', year)
      .in('course_id', courseIds)

    if (error) throw error

    const scalingMap: Record<string, ScalingData> = {}
    for (const row of scalingRows ?? []) {
      scalingMap[row.course_id] = row
    }

    const result = calculateATAR(subjects, scalingMap)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[atar/calculate]', err)
    return NextResponse.json({ error: 'ATAR calculation failed' }, { status: 500 })
  }
}
