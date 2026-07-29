import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react'
import type { TrendResult } from '../../lib/reports/aggregations'

interface KpiTileProps {
  icon: LucideIcon
  iconVariant: 'blue' | 'green' | 'amber'
  label: string
  value: string
  trend: TrendResult | null
}

/**
 * figura5-rapoarte.png: trend color is purely directional (green up / red
 * down), not "good vs bad" — confirmed at native resolution where "În
 * așteptare validare" (falling backlog, actually good news) still renders
 * its ↓8% in red, same as any other decrease.
 */
export function KpiTile({ icon: Icon, iconVariant, label, value, trend }: KpiTileProps) {
  return (
    <div className="reports-kpi-tile">
      <span className={`reports-kpi-tile__icon reports-kpi-tile__icon--${iconVariant}`}>
        <Icon aria-hidden="true" size={20} />
      </span>
      <span className="reports-kpi-tile__label">{label}</span>
      <span className="reports-kpi-tile__value">{value}</span>
      {trend && (
        <span
          className={`reports-kpi-tile__trend reports-kpi-tile__trend--${trend.direction === 'down' ? 'down' : 'up'}`}
        >
          {trend.direction === 'down' ? (
            <ArrowDown aria-hidden="true" size={12} />
          ) : (
            <ArrowUp aria-hidden="true" size={12} />
          )}
          {trend.percent.toFixed(1).replace(/\.0$/, '')}% față de perioada anterioară
        </span>
      )}
    </div>
  )
}
