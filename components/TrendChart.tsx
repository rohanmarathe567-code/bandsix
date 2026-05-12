'use client'

import { useEffect, useRef } from 'react'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
} from 'chart.js'
import type { TrendDataPoint } from '@/lib/types'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler)

interface TrendChartProps {
  data: TrendDataPoint[]
  label?: string
  color?: string
  height?: number
  showAxis?: boolean
}

export default function TrendChart({
  data,
  label = 'Band 6 Count',
  color = '#3b82f6',
  height = 220,
  showAxis = true,
}: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy() }

    const ctx = canvasRef.current.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '00')

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.year),
        datasets: [{
          label,
          data: data.map(d => d.value),
          borderColor: color,
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: '#060611',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            backgroundColor: '#1a1a2e',
            borderColor: '#2d2d45',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            padding: 10,
            callbacks: {
              label: ctx => ` ${label}: ${(ctx.parsed.y ?? 0).toLocaleString()}`,
            },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            display: showAxis,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', font: { size: 11 } },
            border: { color: '#1e1e2e' },
          },
          y: {
            display: showAxis,
            beginAtZero: false,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', font: { size: 11 } },
            border: { color: '#1e1e2e' },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [data, label, color, height, showAxis])

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
