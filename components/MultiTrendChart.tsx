'use client'

import { useEffect, useRef } from 'react'
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

export interface TrendSeries {
  label: string
  data: { year: number; value: number }[]
  color: string
}

interface Props {
  series: TrendSeries[]
  height?: number
}

export default function MultiTrendChart({ series, height = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || series.length === 0) return
    chartRef.current?.destroy()

    const allYears = Array.from(new Set(series.flatMap(s => s.data.map(d => d.year)))).sort()
    const ctx = canvasRef.current.getContext('2d')!

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allYears,
        datasets: series.map(s => {
          const gradient = ctx.createLinearGradient(0, 0, 0, height)
          gradient.addColorStop(0, s.color + '30')
          gradient.addColorStop(1, s.color + '00')
          const yearMap = Object.fromEntries(s.data.map(d => [d.year, d.value]))
          return {
            label: s.label,
            data: allYears.map(y => yearMap[y] ?? null),
            borderColor: s.color,
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: s.color,
            pointBorderColor: '#060611',
            pointBorderWidth: 2,
            spanGaps: true,
          }
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#94a3b8', font: { size: 12 }, boxWidth: 12, padding: 16 },
          },
          tooltip: {
            backgroundColor: '#1a1a2e',
            borderColor: '#2d2d45',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            padding: 10,
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', font: { size: 11 } },
            border: { color: '#1e1e2e' },
          },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', font: { size: 11 } },
            border: { color: '#1e1e2e' },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [series, height])

  return <div style={{ height }}><canvas ref={canvasRef} /></div>
}
