'use client'
import { Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { formatShortDate, formatCurrency } from '@/lib/format'
import type { DayProjection } from '@/lib/projection'

interface Props {
  days: DayProjection[]
  criticalDay: string | null
}

export default function ProjectionChart({ days, criticalDay }: Props) {
  const data = days.map(d => ({
    date: d.date,
    label: formatShortDate(d.date),
    balance: Math.round(d.balance * 100) / 100,
  }))

  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 mb-3">Projeção 30 dias</p>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            interval={6}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), 'Saldo']}
            labelStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="3 3" />
          {criticalDay && (
            <ReferenceLine
              x={formatShortDate(criticalDay)}
              stroke="#dc2626"
              strokeWidth={2}
              label={{ value: '⚠️', position: 'top', fontSize: 14 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#2563eb"
            strokeWidth={2}
            fill="#eff6ff"
            fillOpacity={0.6}
          />
          <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
