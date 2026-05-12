'use client'

import { useEffect, useRef } from 'react'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
} from 'chart.js'
import type { SparklineData } from '@/lib/types'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler)

interface SparklineChartProps {
  data: SparklineData
  color?: string
  width?: number
  height?: number
}

export default function SparklineChart({
  data,
  color = '#3b82f6',
  width = 80,
  height = 32,
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || data.values.length < 2) return
    if (chartRef.current) chartRef.current.destroy()

    const ctx = canvasRef.current.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, color + '60')
    gradient.addColorStop(1, color + '00')

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.years,
        datasets: [{
          data: data.values,
          borderColor: color,
          borderWidth: 1.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    })

    return () => chartRef.current?.destroy()
  }, [data, color, height])

  if (data.values.length < 2) return null

  return <canvas ref={canvasRef} width={width} height={height} style={{ width, height }} />
}
