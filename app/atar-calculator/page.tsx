'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Select from 'react-select'
import {
  Calculator, Plus, Trash2, Info, GraduationCap,
  Target, ExternalLink, ChevronDown, ChevronUp,
  TrendingUp, Check, X, AlertCircle, School,
} from 'lucide-react'
import { atarColour, atarBand, aggregateToATAR, atarToAggregate } from '@/lib/atar'
import { UNI_CUTOFFS, groupByUniversity } from '@/lib/uni-cutoffs'

const YEARS       = [2025, 2024, 2023, 2022, 2021, 2020, 2019]
const PRIMARY_YEAR = 2025

interface ScalingRow {
  slope: number; intercept: number
  mean_raw: number; mean_scaled: number; band6_cutoff: number
}
interface Subject {
  id: string; name: string; slug: string; units: number; is_extension: boolean
  scaling: Record<number, ScalingRow>
}
interface Row { id: string; subject: Subject | null; mark: string }

interface SchoolOption { id: string; name: string; type: string; slug: string }
interface SchoolContext {
  school: SchoolOption
  yearly_stats: {
    year: number; total_b6: number; unique_students: number
    state_ranks_count: number; all_rounders_count: number; rank: number
  }[]
  course_stats: Record<string, Record<string, number>> // courseId -> year(str) -> count
}

type TabType = 'estimate' | 'reverse'

function uid() { return Math.random().toString(36).slice(2) }
function newRow(): Row { return { id: uid(), subject: null, mark: '' } }

function scaledMark(hsc: number, s: ScalingRow): number {
  return Math.min(50, Math.max(0, s.slope * hsc + s.intercept))
}

// Returns aggregate (correctly weighted by units), which subjects are counted, and total units counted.
// Aggregate = sum(scaled_i × units_i) for best 10 units selected.
// Max aggregate = 10 units × 50 per unit = 500, matching the AGGREGATE_TO_ATAR lookup table.
function calcAggregateDetailed(rows: Row[], year: number): {
  aggregate: number | null
  selectedIds: Set<string>
  countedUnits: number
} {
  const valid = rows.filter(r => r.subject && r.mark !== '' && !isNaN(parseFloat(r.mark)))
  if (valid.length === 0) return { aggregate: null, selectedIds: new Set(), countedUnits: 0 }

  const items = valid.map(r => {
    const hsc  = parseFloat(r.mark)
    const s    = r.subject!.scaling[year]
    const scaled = s ? scaledMark(hsc, s) : Math.min(50, hsc / 2)
    return { rowId: r.id, subject: r.subject!, scaled, units: r.subject!.units }
  })

  const english = items.filter(i => i.subject.name.toLowerCase().includes('english'))
  const other   = items.filter(i => !i.subject.name.toLowerCase().includes('english'))

  // Sort by scaled descending — this maximises aggregate contribution per unit slot
  const byScaled = (a: typeof items[0], b: typeof items[0]) => b.scaled - a.scaled
  english.sort(byScaled)
  other.sort(byScaled)

  const selected: typeof items = []
  let units = 0

  // Step 1: must include best English worth at least 2 units
  for (const e of english) {
    if (units >= 2) break
    if (units + e.units <= 10) { selected.push(e); units += e.units }
  }

  // Step 2: fill remaining slots with best remaining (non-English first, then leftover English)
  const rest = [...other, ...english.filter(e => !selected.includes(e))]
  rest.sort(byScaled)
  for (const r of rest) {
    if (units >= 10) break
    if (units + r.units <= 10) { selected.push(r); units += r.units }
  }

  // FIX: multiply each subject's scaled mark by its units
  // A 2-unit subject at scaled 45 contributes 45×2=90; a 1-unit extension at 30 contributes 30×1=30
  const aggregate = selected.reduce((sum, i) => sum + i.scaled * i.units, 0)
  return { aggregate, selectedIds: new Set(selected.map(i => i.rowId)), countedUnits: units }
}

export default function ATARCalculatorPage() {
  const [tab, setTab]     = useState<TabType>('estimate')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [rows, setRows]   = useState<Row[]>([newRow(), newRow(), newRow(), newRow(), newRow()])
  const [showYears, setShowYears] = useState(false)
  const [showUni,   setShowUni]   = useState(true)
  const [uniFilter, setUniFilter] = useState<'qualify' | 'all'>('qualify')

  // School context
  const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(null)
  const [schoolContext,  setSchoolContext]  = useState<SchoolContext | null>(null)
  const [schoolOptions,  setSchoolOptions]  = useState<SchoolOption[]>([])
  const schoolTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reverse tab
  const [targetATAR,   setTargetATAR]   = useState('90.00')
  const [reverseRows,  setReverseRows]  = useState<Row[]>([newRow(), newRow(), newRow()])

  // Load subjects on mount
  useEffect(() => {
    fetch('/api/atar/subjects')
      .then(r => r.json())
      .then(d => setSubjects(Array.isArray(d) ? d : []))
  }, [])

  // Load initial school list
  useEffect(() => {
    fetch('/api/schools?limit=50')
      .then(r => r.json())
      .then(d => setSchoolOptions(Array.isArray(d) ? d : []))
  }, [])

  // Debounced school search
  const searchSchools = useCallback((q: string) => {
    if (schoolTimer.current) clearTimeout(schoolTimer.current)
    schoolTimer.current = setTimeout(() => {
      fetch(`/api/schools?search=${encodeURIComponent(q)}&limit=20`)
        .then(r => r.json())
        .then(d => setSchoolOptions(Array.isArray(d) ? d : []))
    }, 220)
  }, [])

  // Fetch school context when school or selected subjects change
  const subjectIds = rows.filter(r => r.subject).map(r => r.subject!.id).sort().join(',')
  useEffect(() => {
    if (!selectedSchool) { setSchoolContext(null); return }
    const ids = rows.filter(r => r.subject).map(r => r.subject!.id)
    const params = new URLSearchParams({ school_id: selectedSchool.id })
    if (ids.length > 0) params.set('course_ids', ids.join(','))
    fetch(`/api/atar/school-context?${params}`)
      .then(r => r.json())
      .then(d => setSchoolContext(d))
      .catch(() => {})
  }, [selectedSchool?.id, subjectIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Row helpers
  const updateSubject = (id: string, sub: Subject | null) => setRows(r => r.map(row => row.id === id ? { ...row, subject: sub } : row))
  const updateMark    = (id: string, mark: string)        => setRows(r => r.map(row => row.id === id ? { ...row, mark } : row))
  const removeRow     = (id: string) => setRows(r => r.filter(row => row.id !== id))
  const addRow        = () => setRows(r => [...r, newRow()])

  const updateRevSub  = (id: string, sub: Subject | null) => setReverseRows(r => r.map(row => row.id === id ? { ...row, subject: sub } : row))
  const removeRevRow  = (id: string) => setReverseRows(r => r.filter(row => row.id !== id))

  // Calculations
  const detailedByYear = useMemo(() =>
    Object.fromEntries(YEARS.map(y => [y, calcAggregateDetailed(rows, y)])),
  [rows])

  const primary = detailedByYear[PRIMARY_YEAR]

  const atarByYear = useMemo(() =>
    Object.fromEntries(YEARS.map(y => {
      const d = detailedByYear[y]
      return [y, d.aggregate != null ? aggregateToATAR(d.aggregate) : null]
    })),
  [detailedByYear])

  const latestATAR = (atarByYear[PRIMARY_YEAR] ?? atarByYear[2024]) as number | null

  const totalEnteredUnits = rows
    .filter(r => r.subject && r.mark !== '' && !isNaN(parseFloat(r.mark)))
    .reduce((sum, r) => sum + (r.subject?.units ?? 0), 0)

  const hasEnoughUnits = totalEnteredUnits >= 10
  const hasData = rows.some(r => r.subject && r.mark !== '')

  // Impact analysis: +5 marks in each subject → ATAR change
  const impacts = useMemo(() => {
    if (!hasEnoughUnits || latestATAR == null) return {} as Record<string, number>
    const result: Record<string, number> = {}
    for (const row of rows) {
      if (!row.subject || row.mark === '' || isNaN(parseFloat(row.mark))) continue
      const bumped   = Math.min(100, parseFloat(row.mark) + 5)
      const newRows  = rows.map(r => r.id === row.id ? { ...r, mark: String(bumped) } : r)
      const detail   = calcAggregateDetailed(newRows, PRIMARY_YEAR)
      const newAtar  = detail.aggregate != null ? aggregateToATAR(detail.aggregate) : null
      result[row.id] = newAtar != null ? Math.round((newAtar - latestATAR) * 100) / 100 : 0
    }
    return result
  }, [rows, latestATAR, hasEnoughUnits])

  // University pathways
  const byUni = useMemo(() => {
    if (!latestATAR || !hasEnoughUnits) return {}
    const list = uniFilter === 'qualify'
      ? UNI_CUTOFFS.filter(c => latestATAR >= c.atar)
      : UNI_CUTOFFS
    return groupByUniversity(list)
  }, [latestATAR, uniFilter, hasEnoughUnits])

  // Reverse tab
  const targetAgg      = atarToAggregate(parseFloat(targetATAR) || 0)
  const revSubjects    = reverseRows.filter(r => r.subject)
  const totalRevUnits  = revSubjects.reduce((sum, r) => sum + (r.subject?.units ?? 0), 0)
  const hasEnglish     = revSubjects.some(r => r.subject!.name.toLowerCase().includes('english'))

  // Calculate required scaled mark per unit for target aggregate
  // ATAR uses best 10 units, so each unit needs to contribute targetAgg/10 scaled marks
  const requiredScaledPerUnit = totalRevUnits >= 10 && hasEnglish ? targetAgg / 10 : 0

  const reverseResults = revSubjects.map(r => {
    const s       = r.subject!
    const keys    = Object.keys(s.scaling).map(Number).sort((a, b) => b - a)
    const scaling = s.scaling[PRIMARY_YEAR] ?? s.scaling[keys[0]]
    if (!scaling || scaling.slope <= 0 || requiredScaledPerUnit <= 0) {
      return { subject: s, required: null as number | null }
    }
    // Each unit contributes requiredScaledPerUnit scaled marks
    // So this subject needs: requiredScaledPerUnit * units scaled marks total
    // Solve: requiredScaledPerUnit * units = slope * hsc + intercept
    const hsc = (requiredScaledPerUnit * s.units - scaling.intercept) / scaling.slope
    return { subject: s, required: Math.min(100, Math.max(1, Math.round(hsc))) }
  })

  const subjectOptions = subjects.map(s => ({ value: s.id, label: s.name, data: s }))
  const schoolOpts     = schoolOptions.map(s => ({ value: s.id, label: s.name, data: s }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Calculator size={20} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">ATAR Calculator</h1>
          <p className="text-text-secondary text-sm">Live scaling 2019–2025 · School context · University pathways · Reverse calculator</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav mb-6 w-fit">
        <button onClick={() => setTab('estimate')} className={`tab-btn ${tab === 'estimate' ? 'active' : ''}`}>Estimate ATAR</button>
        <button onClick={() => setTab('reverse')}  className={`tab-btn ${tab === 'reverse'  ? 'active' : ''}`}>What marks do I need?</button>
      </div>

      {/* ── ESTIMATE TAB ─────────────────────────────────────────────── */}
      {tab === 'estimate' && (
        <div className="space-y-5">

          <div className="flex gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-300">
            <Info size={15} className="shrink-0 mt-0.5" />
            Estimate only. UAC's formula is proprietary and results may differ by ±2–3 points.
          </div>

          {/* School selector */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              <School size={12} />
              Your School
              <span className="font-normal normal-case text-text-muted">(optional — shows your school's Band 6 counts per subject)</span>
            </label>
            <Select
              classNamePrefix="rs"
              options={schoolOpts}
              value={selectedSchool ? { value: selectedSchool.id, label: selectedSchool.name, data: selectedSchool } : null}
              onChange={opt => setSelectedSchool(opt?.data ?? null)}
              onInputChange={v => v && searchSchools(v)}
              placeholder="Search for your school..."
              isSearchable isClearable
              noOptionsMessage={() => 'Type to search'}
            />
            {selectedSchool && schoolContext?.yearly_stats[0] && (() => {
              const s = schoolContext.yearly_stats[0]
              return (
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary">
                  <span><strong className="text-text-primary">#{s.rank}</strong> statewide · {s.year}</span>
                  <span><strong className="text-text-primary">{s.total_b6.toLocaleString()}</strong> Band 6s</span>
                  {s.state_ranks_count > 0 && <span><strong className="text-text-primary">{s.state_ranks_count}</strong> state ranks</span>}
                  {s.all_rounders_count > 0 && <span><strong className="text-text-primary">{s.all_rounders_count}</strong> all-rounders</span>}
                </div>
              )
            })()}
          </div>

          {/* Units progress bar */}
          {hasData && (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${totalEnteredUnits >= 10 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (totalEnteredUnits / 10) * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium shrink-0 tabular-nums ${totalEnteredUnits >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalEnteredUnits}/10 units{!hasEnoughUnits && ` · need ${10 - totalEnteredUnits} more`}
              </span>
            </div>
          )}

          {/* Subject table */}
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated text-text-muted text-xs uppercase tracking-wider">
                    <th className="px-3 py-2.5 text-left w-7" />
                    <th className="px-3 py-2.5 text-left min-w-[200px]">Course</th>
                    <th className="px-3 py-2.5 text-center w-16">Units</th>
                    <th className="px-3 py-2.5 text-center w-24">HSC Mark</th>
                    <th className="px-3 py-2.5 text-center w-24">
                      Scaled <span className="normal-case text-[10px]">({PRIMARY_YEAR})</span>
                    </th>
                    <th className="px-3 py-2.5 text-center w-20">+5 impact</th>
                    <th className="px-2 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => {
                    const hsc      = parseFloat(row.mark)
                    const scaling  = row.subject?.scaling[PRIMARY_YEAR]
                    const sm       = row.subject && !isNaN(hsc) && scaling ? scaledMark(hsc, scaling) : null
                    const isBand6  = !isNaN(hsc) && hsc >= 90
                    const isBand5  = !isNaN(hsc) && hsc >= 80 && hsc < 90
                    const isCounted = primary.selectedIds.has(row.id)
                    const impact   = impacts[row.id]
                    const hasMarkAndSubject = row.subject && row.mark !== ''

                    // School context: band 6s at school for this course in most recent year
                    const courseStats = selectedSchool && schoolContext && row.subject
                      ? schoolContext.course_stats[row.subject.id]
                      : null
                    const b6AtSchool = courseStats
                      ? (courseStats['2025'] ?? courseStats['2024'] ?? courseStats['2023'] ?? null)
                      : null

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-white/[0.02] transition-colors ${hasEnoughUnits && hasMarkAndSubject && !isCounted ? 'opacity-50' : ''}`}
                      >
                        {/* Counted indicator */}
                        <td className="px-3 py-2">
                          {hasEnoughUnits && hasMarkAndSubject ? (
                            isCounted
                              ? <Check size={13} className="text-emerald-500" />
                              : <X     size={13} className="text-text-muted" />
                          ) : (
                            <span className="text-text-muted text-xs">{i + 1}</span>
                          )}
                        </td>

                        {/* Course selector */}
                        <td className="px-3 py-2">
                          <Select
                            classNamePrefix="rs"
                            options={subjectOptions}
                            value={row.subject ? { value: row.subject.id, label: row.subject.name, data: row.subject } : null}
                            onChange={opt => updateSubject(row.id, opt?.data ?? null)}
                            placeholder="Select course..."
                            isSearchable menuPlacement="auto"
                            noOptionsMessage={() => 'No courses found'}
                          />
                          {b6AtSchool != null && (
                            <p className="text-[10px] text-text-muted mt-0.5 ml-1">
                              {b6AtSchool} Band 6{b6AtSchool !== 1 ? 's' : ''} at your school in {
                                courseStats?.['2025'] ? '2025' : courseStats?.['2024'] ? '2024' : '2023'
                              }
                            </p>
                          )}
                        </td>

                        {/* Units */}
                        <td className="px-3 py-2 text-center text-text-muted text-xs">
                          {row.subject ? `${row.subject.units}u` : ''}
                        </td>

                        {/* HSC mark input */}
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="number" min={0} max={100}
                              value={row.mark}
                              onChange={e => updateMark(row.id, e.target.value)}
                              placeholder="0–100"
                              className="w-full bg-bg-elevated border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none text-center"
                            />
                            {row.subject && !isNaN(hsc) && hsc > 0 && (
                              <span
                                title={isBand6 ? 'Band 6' : isBand5 ? 'Band 5' : 'Band 4 or below'}
                                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isBand6 ? 'bg-emerald-500' : isBand5 ? 'bg-amber-500' : 'bg-text-muted/50'}`}
                              />
                            )}
                          </div>
                        </td>

                        {/* Scaled mark */}
                        <td className="px-3 py-2 text-center">
                          {sm != null && (
                            <span className="font-mono text-sm text-text-primary">{sm.toFixed(1)}</span>
                          )}
                        </td>

                        {/* +5 impact */}
                        <td className="px-3 py-2 text-center">
                          {impact != null && impact > 0 && (
                            <span className="text-xs font-semibold text-emerald-400">+{impact.toFixed(2)}</span>
                          )}
                          {impact != null && impact === 0 && parseFloat(row.mark) >= 100 && (
                            <span className="text-xs text-text-muted">max</span>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="px-2 py-2">
                          <button
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length <= 1}
                            className="text-text-muted hover:text-red-400 transition-colors disabled:opacity-20"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4">
              <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
                <Plus size={14} /> Add course
              </button>
              <span className="text-text-muted text-xs text-right">
                {hasEnoughUnits
                  ? <><Check size={11} className="inline mr-0.5 text-emerald-500" /> = counted in best 10 units · English required</>
                  : 'Minimum 10 units required for ATAR estimate'}
              </span>
            </div>
          </div>

          {/* Not enough units warning */}
          {hasData && !hasEnoughUnits && (
            <div className="flex gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {10 - totalEnteredUnits} more unit{10 - totalEnteredUnits !== 1 ? 's' : ''} needed
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  The NSW HSC ATAR requires at least 10 units. Add more subjects to unlock your estimate.
                </p>
              </div>
            </div>
          )}

          {/* Results — only when ≥10 units */}
          {latestATAR != null && hasEnoughUnits && (
            <>
              {/* ATAR banner */}
              <div className="bg-bg-card border border-border rounded-xl p-6">
                <div className="flex items-start gap-6 flex-wrap">
                  {/* Big number */}
                  <div className="text-center shrink-0">
                    <div className="text-xs text-text-muted mb-1 uppercase tracking-wide">{PRIMARY_YEAR} estimate</div>
                    <div className={`text-6xl font-black tabular-nums leading-none ${atarColour(latestATAR)}`}>
                      {latestATAR.toFixed(2)}
                    </div>
                    <div className={`text-sm font-semibold mt-2 ${atarColour(latestATAR)}`}>{atarBand(latestATAR)}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">±2–3 uncertainty range</div>
                  </div>

                  {/* Bar + year toggle */}
                  <div className="flex-1 min-w-[180px]">
                    {/* ATAR position bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                        <span>0</span><span>50</span><span>75</span><span>90</span><span>99.95</span>
                      </div>
                      <div className="relative h-3 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{ background: 'linear-gradient(to right, #64748b44, #3b82f666, #10b98166, #f59e0b99, #fbbf24)' }}
                        />
                        <div
                          className="absolute top-0.5 bottom-0.5 w-1.5 bg-white rounded-full shadow-lg transition-all duration-500"
                          style={{ left: `calc(${(latestATAR / 99.95) * 100}% - 3px)` }}
                        />
                      </div>
                    </div>

                    {/* Other years */}
                    <button
                      onClick={() => setShowYears(v => !v)}
                      className="text-xs text-text-muted flex items-center gap-1 hover:text-text-secondary transition-colors mb-2"
                    >
                      {showYears ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      Compare across all scaling years
                    </button>
                    {showYears && (
                      <div className="grid grid-cols-3 gap-2">
                        {YEARS.filter(y => y !== PRIMARY_YEAR).map(y => {
                          const a = atarByYear[y]
                          return a != null ? (
                            <div key={y} className="text-center bg-bg-elevated rounded-lg p-2">
                              <div className="text-text-muted text-[10px]">{y}</div>
                              <div className={`text-sm font-bold ${atarColour(a)}`}>{a.toFixed(2)}</div>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject breakdown */}
              {primary.selectedIds.size > 0 && (() => {
                const counted  = rows.filter(r => primary.selectedIds.has(r.id))
                const excluded = rows.filter(r => r.subject && r.mark !== '' && !primary.selectedIds.has(r.id))
                return excluded.length > 0 ? (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                      Subjects counted ({primary.countedUnits} units)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {counted.map(r => r.subject && (
                        <span key={r.id} className="flex items-center gap-1 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          <Check size={10} /> {r.subject.name} ({r.subject.units}u)
                        </span>
                      ))}
                    </div>
                    {excluded.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mt-3 mb-2">
                          Not counted (lower scaled marks)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {excluded.map(r => r.subject && (
                            <span key={r.id} className="flex items-center gap-1 text-xs bg-bg-elevated border border-border text-text-muted px-2 py-0.5 rounded-full">
                              <X size={10} /> {r.subject.name} ({r.subject.units}u)
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : null
              })()}

              {/* Impact analysis */}
              {Object.keys(impacts).length > 0 && (
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <TrendingUp size={12} />
                    Where to focus — +5 marks impact on ATAR
                  </h3>
                  <div className="space-y-2.5">
                    {rows
                      .filter(r => r.subject && r.mark !== '' && impacts[r.id] != null)
                      .sort((a, b) => (impacts[b.id] ?? 0) - (impacts[a.id] ?? 0))
                      .map(r => {
                        const imp = impacts[r.id] ?? 0
                        const maxImp = Math.max(...Object.values(impacts).filter(v => v > 0), 0.01)
                        const isMax = parseFloat(r.mark) >= 100
                        return (
                          <div key={r.id} className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary w-44 truncate shrink-0">{r.subject!.name}</span>
                            <div className="flex-1 bg-bg-elevated rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500/70 transition-all"
                                style={{ width: isMax ? '0%' : `${(imp / maxImp) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-14 text-right shrink-0 text-emerald-400">
                              {isMax ? 'maxed' : imp > 0 ? `+${imp.toFixed(2)}` : '+0.00'}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                  <p className="text-[10px] text-text-muted mt-3">
                    ATAR gain from scoring 5 more marks in each subject. Focus where the impact is highest.
                  </p>
                </div>
              )}

              {/* School context panel */}
              {selectedSchool && schoolContext && schoolContext.yearly_stats.length > 0 && (
                <div className="bg-bg-card border border-border rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <School size={12} />
                    {selectedSchool.name}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(() => {
                      const s = schoolContext.yearly_stats[0]
                      return [
                        { label: `${s.year} rank`,      value: `#${s.rank}` },
                        { label: 'Band 6s',              value: s.total_b6.toLocaleString() },
                        { label: 'State ranks',          value: s.state_ranks_count.toLocaleString() },
                        { label: 'All-rounders',         value: s.all_rounders_count.toLocaleString() },
                      ].map(stat => (
                        <div key={stat.label} className="bg-bg-elevated rounded-lg p-3 text-center">
                          <div className="text-sm font-bold text-text-primary">{stat.value}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{stat.label}</div>
                        </div>
                      ))
                    })()}
                  </div>
                  <p className="text-[10px] text-text-muted mt-3">
                    Your internal assessment marks are moderated to your school's external exam performance in each subject.
                    Top-ranked schools often see internal marks lifted by 1–3 ATAR points.
                  </p>
                </div>
              )}

              {/* University pathways */}
              <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowUni(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <GraduationCap size={15} className="text-emerald-400" />
                    University Pathways
                    <span className="text-xs font-normal text-text-muted">
                      ({UNI_CUTOFFS.filter(c => latestATAR >= c.atar).length} courses qualify)
                    </span>
                  </h3>
                  {showUni ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                </button>
                {showUni && (
                  <div className="border-t border-border">
                    <div className="flex gap-2 px-5 py-3 border-b border-border">
                      {(['qualify', 'all'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setUniFilter(f)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            uniFilter === f
                              ? 'bg-primary/15 border-primary/30 text-primary-light'
                              : 'border-border text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          {f === 'qualify'
                            ? `I qualify for (${UNI_CUTOFFS.filter(c => latestATAR >= c.atar).length})`
                            : `All courses (${UNI_CUTOFFS.length})`}
                        </button>
                      ))}
                    </div>
                    <div className="divide-y divide-border max-h-80 overflow-y-auto">
                      {Object.entries(byUni).map(([uni, courses]) => (
                        <div key={uni}>
                          <div className="px-5 py-2 bg-bg-elevated/50 text-xs font-semibold text-text-muted uppercase tracking-wider sticky top-0">{uni}</div>
                          {courses.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between px-5 py-2 hover:bg-white/[0.02]">
                              <span className="text-sm text-text-primary">{c.course}</span>
                              <div className="flex items-center gap-3 shrink-0 ml-3">
                                <span className={`text-xs font-mono font-bold ${latestATAR >= c.atar ? 'text-emerald-400' : 'text-text-muted'}`}>
                                  {c.atar.toFixed(2)}+
                                </span>
                                {latestATAR >= c.atar
                                  ? <span className="text-xs text-emerald-400 font-medium">Qualifies</span>
                                  : <span className="text-xs text-amber-400">{(c.atar - latestATAR).toFixed(2)} needed</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      {Object.keys(byUni).length === 0 && (
                        <p className="px-5 py-8 text-center text-text-muted text-sm">No qualifying courses yet — keep working at it.</p>
                      )}
                    </div>
                    <div className="px-5 py-3 border-t border-border bg-bg-elevated/50 text-xs text-text-muted flex items-center gap-1.5">
                      <ExternalLink size={11} />
                      Based on 2024 UAC published selection ranks. Always verify at{' '}
                      <a href="https://www.uac.edu.au" target="_blank" rel="noopener noreferrer" className="underline">uac.edu.au</a>.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── REVERSE TAB ──────────────────────────────────────────────── */}
      {tab === 'reverse' && (
        <div className="space-y-5">
          <div className="flex gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-300">
            <Target size={15} className="shrink-0 mt-0.5" />
            Enter your target ATAR and the subjects you plan to take. You must include at least one English course.
            Uses {PRIMARY_YEAR} scaling data.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target ATAR input */}
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-3">Target ATAR</label>
              <div className="flex items-center gap-4">
                <input
                  type="number" min={0} max={99.95} step={0.05}
                  value={targetATAR}
                  onChange={e => setTargetATAR(e.target.value)}
                  className="w-28 bg-bg-elevated border border-border rounded-xl px-3 py-2.5 text-3xl font-black text-text-primary focus:border-primary focus:outline-none text-center"
                />
                <div>
                  <div className={`text-xl font-bold ${atarColour(parseFloat(targetATAR) || 0)}`}>
                    {atarBand(parseFloat(targetATAR) || 0)}
                  </div>
                  <div className="text-text-muted text-xs mt-0.5">aggregate ≈ {targetAgg.toFixed(0)}</div>
                  <div className="text-text-muted text-xs">required scaled ≈ {requiredScaledPerUnit.toFixed(1)}/unit</div>
                </div>
              </div>
            </div>

            {/* Units summary */}
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Units entered</div>
              <div className={`text-4xl font-black ${totalRevUnits >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {totalRevUnits}<span className="text-lg text-text-muted font-normal"> / 10</span>
              </div>
              <div className="text-xs text-text-muted mt-2">
                {totalRevUnits < 10
                  ? `Add ${10 - totalRevUnits} more unit${10 - totalRevUnits !== 1 ? 's' : ''}`
                  : !hasEnglish
                  ? 'Must include at least one English course'
                  : 'Ready to calculate required marks'}
              </div>
            </div>
          </div>

          {/* Subject selector */}
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-bg-elevated">
              <h2 className="text-sm font-semibold text-text-primary">Your Subjects</h2>
            </div>
            <div className="divide-y divide-border">
              {reverseRows.map((row, i) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-text-muted text-xs w-4 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <Select
                      classNamePrefix="rs"
                      options={subjectOptions}
                      placeholder="Select course..."
                      value={row.subject ? { value: row.subject.id, label: row.subject.name, data: row.subject } : null}
                      onChange={opt => updateRevSub(row.id, opt?.data ?? null)}
                      isSearchable menuPlacement="auto"
                    />
                  </div>
                  <div className="text-text-muted text-xs w-8 text-center shrink-0">
                    {row.subject ? `${row.subject.units}u` : ''}
                  </div>
                  <button
                    onClick={() => removeRevRow(row.id)}
                    disabled={reverseRows.length <= 1}
                    className="text-text-muted hover:text-red-400 transition-colors disabled:opacity-20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border">
              <button
                onClick={() => setReverseRows(r => [...r, newRow()])}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <Plus size={14} /> Add subject
              </button>
            </div>
          </div>

          {/* Required marks results */}
          {reverseResults.length > 0 && totalRevUnits >= 10 && hasEnglish && (
            <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-bg-elevated">
                <h3 className="text-sm font-semibold text-text-primary">
                  Marks needed for ATAR {targetATAR}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Uses {PRIMARY_YEAR} scaling. Assumes your subjects will be among the best 10 units counted.
                  Each unit needs {requiredScaledPerUnit.toFixed(1)} scaled marks on average.
                </p>
              </div>
              <div className="divide-y divide-border">
                {reverseResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-text-primary font-medium text-sm">{r.subject.name}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {r.subject.units}u
                        {r.required != null && r.required <= 90 && (
                          <span className="ml-2 text-text-muted">
                            · scaled ≈ {(() => {
                              const scaling = r.subject.scaling[PRIMARY_YEAR]
                              return scaling ? scaledMark(r.required, scaling).toFixed(1) : '–'
                            })()}
                          </span>
                        )}
                      </p>
                    </div>
                    {r.required != null ? (
                      <div className="text-right">
                        <div className={`text-4xl font-black font-mono leading-none ${
                          r.required >= 90 ? 'text-emerald-400'
                          : r.required >= 80 ? 'text-blue-400'
                          : r.required >= 70 ? 'text-amber-400'
                          : 'text-text-secondary'
                        }`}>
                          {r.required}
                        </div>
                        <div className="text-[10px] text-text-muted mt-1">
                          {r.required >= 90 ? 'Band 6' : r.required >= 80 ? 'Band 5' : r.required >= 70 ? 'Band 4' : 'Band 3'}
                          {r.required >= 90 && <span className="ml-1 badge badge-band6 py-0">B6</span>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-text-muted text-sm">No scaling data</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border bg-bg-elevated/50 text-xs text-text-muted">
                These are approximate marks assuming equal effort across subjects.
                If you excel in one subject you can afford lower marks in others.
                Actual required marks depend on your year's cohort performance.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
