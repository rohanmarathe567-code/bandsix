import type { SubjectEntry, SubjectEntryResult, ATARResult, ScalingData } from './types'

// ============================================================
// ATAR Calculation Engine
// ============================================================
// This implements a simplified but reasonable approximation of the
// UAC ATAR scaling process based on publicly available UAC reports.
//
// The actual UAC formula is proprietary. This approximation uses:
//   scaled = slope * raw + intercept
// where slope/intercept are derived from historical UAC scaling reports.
// ============================================================

// Aggregate to ATAR lookup table (based on UAC historical data)
// aggregate is out of 500 (10 units × 50 max scaled per unit)
const AGGREGATE_TO_ATAR: [number, number][] = [
  [500, 99.95],
  [498, 99.90],
  [495, 99.85],
  [492, 99.80],
  [490, 99.75],
  [487, 99.70],
  [484, 99.60],
  [481, 99.50],
  [478, 99.40],
  [475, 99.30],
  [472, 99.20],
  [469, 99.10],
  [466, 99.00],
  [463, 98.80],
  [460, 98.60],
  [457, 98.40],
  [454, 98.20],
  [451, 98.00],
  [447, 97.50],
  [443, 97.00],
  [439, 96.50],
  [435, 96.00],
  [431, 95.50],
  [427, 95.00],
  [422, 94.00],
  [417, 93.00],
  [412, 92.00],
  [407, 91.00],
  [402, 90.00],
  [396, 89.00],
  [390, 88.00],
  [384, 87.00],
  [378, 86.00],
  [372, 85.00],
  [366, 84.00],
  [360, 83.00],
  [354, 82.00],
  [348, 81.00],
  [342, 80.00],
  [335, 79.00],
  [328, 78.00],
  [321, 77.00],
  [314, 76.00],
  [307, 75.00],
  [300, 74.00],
  [293, 73.00],
  [286, 72.00],
  [279, 71.00],
  [272, 70.00],
  [264, 69.00],
  [256, 68.00],
  [248, 67.00],
  [240, 66.00],
  [232, 65.00],
  [224, 64.00],
  [216, 63.00],
  [208, 62.00],
  [200, 61.00],
  [192, 60.00],
  [183, 59.00],
  [174, 58.00],
  [165, 57.00],
  [156, 56.00],
  [147, 55.00],
  [138, 54.00],
  [129, 53.00],
  [120, 52.00],
  [111, 51.00],
  [102, 50.00],
  [93,  49.00],
  [84,  48.00],
  [75,  47.00],
  [66,  46.00],
  [57,  45.00],
  [48,  44.00],
  [39,  43.00],
  [30,  42.00],
  [0,   30.00],
]

export function atarToAggregate(targetATAR: number): number {
  for (let i = 0; i < AGGREGATE_TO_ATAR.length - 1; i++) {
    const [highAgg, highATAR] = AGGREGATE_TO_ATAR[i]
    const [lowAgg,  lowATAR]  = AGGREGATE_TO_ATAR[i + 1]
    if (targetATAR >= highATAR) return highAgg
    if (targetATAR >= lowATAR) {
      const ratio = (targetATAR - lowATAR) / (highATAR - lowATAR)
      return Math.round((lowAgg + ratio * (highAgg - lowAgg)) * 100) / 100
    }
  }
  return 0
}

export function aggregateToATAR(aggregate: number): number {
  for (let i = 0; i < AGGREGATE_TO_ATAR.length - 1; i++) {
    const [highAgg, highATAR] = AGGREGATE_TO_ATAR[i]
    const [lowAgg, lowATAR] = AGGREGATE_TO_ATAR[i + 1]
    if (aggregate >= highAgg) return highATAR
    if (aggregate >= lowAgg) {
      // Linear interpolation between the two known points
      const ratio = (aggregate - lowAgg) / (highAgg - lowAgg)
      return Math.round((lowATAR + ratio * (highATAR - lowATAR)) * 100) / 100
    }
  }
  return 30.00
}

export function calculateScaledMark(rawMark: number, scaling: ScalingData): number {
  // Linear scaling model: scaled = slope * raw + intercept
  // Clamped to [0, 50] range (each unit is out of 50 scaled)
  const scaled = scaling.slope * rawMark + scaling.intercept
  return Math.min(50, Math.max(0, Math.round(scaled * 100) / 100))
}

// Default scaling (no data available - assume 1:1 mapping, raw/2 approximation)
export function defaultScaledMark(rawMark: number): number {
  return Math.min(50, Math.round(rawMark / 2 * 100) / 100)
}

export function calculateATAR(
  subjects: SubjectEntry[],
  scalingMap: Record<string, ScalingData>
): ATARResult {
  // Step 1: calculate scaled mark for each subject
  const results: SubjectEntryResult[] = subjects.map(s => {
    const scaling = scalingMap[s.course_id]
    const scaled_mark = scaling
      ? calculateScaledMark(s.hsc_mark, scaling)
      : defaultScaledMark(s.hsc_mark)
    return { ...s, scaled_mark, scaling_data: scaling }
  })

  // Step 2: select best 10 units
  // Rule: must include best English (at least 2 units), then best remaining units up to 10 total
  const englishSubjects = results.filter(s =>
    s.course_name.toLowerCase().includes('english')
  )
  const nonEnglish = results.filter(s =>
    !s.course_name.toLowerCase().includes('english')
  )

  // Sort each group by scaled mark per unit (descending)
  const sortByValue = (a: SubjectEntryResult, b: SubjectEntryResult) =>
    (b.scaled_mark / b.units) - (a.scaled_mark / a.units)

  englishSubjects.sort(sortByValue)
  nonEnglish.sort(sortByValue)

  const selected: SubjectEntryResult[] = []
  let totalUnits = 0

  // Include best English first (minimum 2 units required)
  for (const s of englishSubjects) {
    if (totalUnits + s.units <= 10) {
      selected.push(s)
      totalUnits += s.units
    }
    if (totalUnits >= 2) break
  }

  // Fill remaining units with best non-English (and remaining English)
  const remaining = [...nonEnglish, ...englishSubjects.filter(s => !selected.includes(s))]
  remaining.sort(sortByValue)

  for (const s of remaining) {
    if (totalUnits >= 10) break
    if (totalUnits + s.units <= 10) {
      selected.push(s)
      totalUnits += s.units
    }
  }

  // Step 3: calculate aggregate (sum of scaled marks for selected units)
  const aggregate = selected.reduce((sum, s) => sum + s.scaled_mark, 0)

  // Step 4: convert to ATAR
  const estimated_atar = aggregateToATAR(aggregate)

  // Step 5: uncertainty range ±1.5 ATAR points (scaled)
  const atar_low  = Math.max(0, Math.round((estimated_atar - 1.5) * 100) / 100)
  const atar_high = Math.min(99.95, Math.round((estimated_atar + 1.5) * 100) / 100)

  return {
    estimated_atar,
    atar_low,
    atar_high,
    aggregate: Math.round(aggregate * 100) / 100,
    subjects: results,
  }
}

// Helper to get ATAR colour class based on value
export function atarColour(atar: number): string {
  if (atar >= 99)  return 'text-yellow-400'
  if (atar >= 95)  return 'text-emerald-400'
  if (atar >= 90)  return 'text-cyan-400'
  if (atar >= 80)  return 'text-blue-400'
  if (atar >= 70)  return 'text-indigo-400'
  if (atar >= 50)  return 'text-violet-400'
  return 'text-text-secondary'
}

export function atarBand(atar: number): string {
  if (atar >= 99)  return 'Elite'
  if (atar >= 95)  return 'Excellent'
  if (atar >= 90)  return 'High'
  if (atar >= 80)  return 'Strong'
  if (atar >= 70)  return 'Good'
  if (atar >= 50)  return 'Average'
  return 'Below Average'
}
