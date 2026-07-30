import type { LucideIcon } from 'lucide-react'
import type { TrendResult } from '../../lib/reports/aggregations'
import { formatDuration } from '../../lib/reports/format'

export interface ProcessingTimeRow {
  icon: LucideIcon
  label: string
  seconds: number | null
  trend: TrendResult | null
}

interface ProcessingTimeListProps {
  rows: ProcessingTimeRow[]
}

/**
 * figura5's "Timp mediu procesare" — confirmed at native resolution that
 * this section's trend color is the OPPOSITE convention from the KPI
 * tiles/volume cards: a decreasing duration (faster) renders green here,
 * while a decreasing count renders red on the KPI tiles. Both are real,
 * distinct conventions from the mockup, not a copy-paste of one rule.
 */
export function ProcessingTimeList({ rows }: ProcessingTimeListProps) {
  return (
    <ul className="reports-processing-time">
      {rows.map((row) => {
        const Icon = row.icon
        return (
          <li key={row.label} className="reports-processing-time__row">
            <span className="reports-processing-time__icon">
              <Icon aria-hidden="true" size={13} />
            </span>
            <span className="reports-processing-time__label">{row.label}</span>
            <span className="reports-processing-time__value">
              {row.seconds === null ? '—' : formatDuration(row.seconds)}
            </span>
            {row.trend && (
              <span
                className={`reports-processing-time__trend reports-processing-time__trend--${
                  row.trend.direction === 'down' ? 'good' : 'bad'
                }`}
              >
                {row.trend.direction === 'down' ? '↓' : '↑'} {row.trend.percent.toFixed(0)}%
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
