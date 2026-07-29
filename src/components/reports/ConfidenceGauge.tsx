import type { ConfidenceBand } from '../../lib/reports/aggregations'

interface ConfidenceGaugeProps {
  bands: ConfidenceBand[]
  bandColors: string[]
  averagePercent: number | null
}

const SIZE = 140
const CENTER_X = SIZE / 2
const CENTER_Y = SIZE / 2 + 6
const RADIUS = 52
const STROKE_WIDTH = 16

function polarToCartesian(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER_X + RADIUS * Math.cos(rad), y: CENTER_Y - RADIUS * Math.sin(rad) }
}

/** Semicircle arc from angle 180 (left) to angle 0 (right), sweeping through 90 (top). */
function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArcFlag = startAngle - endAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

/**
 * Hand-rolled SVG gauge — segment widths are proportional to each
 * confidence band's real share of orders (confirmed at native resolution:
 * the red "Sub 80%" band renders as a thin sliver matching its ~8% share,
 * not a fixed 0-80% scale width), not a fixed percentage-of-scale mapping.
 */
export function ConfidenceGauge({ bands, bandColors, averagePercent }: ConfidenceGaugeProps) {
  const total = bands.reduce((sum, band) => sum + band.count, 0)
  let cumulative = 0

  return (
    <div className="reports-gauge">
      <svg className="reports-gauge__svg" viewBox={`0 0 ${SIZE} ${SIZE / 2 + 20}`} role="img" aria-label="Performanță extragere AI">
        {bands.map((band, index) => {
          const fraction = total === 0 ? 0 : band.count / total
          if (fraction === 0) return null
          const startAngle = 180 * (1 - cumulative)
          cumulative += fraction
          const endAngle = 180 * (1 - cumulative)
          return (
            <path
              key={band.label}
              d={describeArc(startAngle, endAngle)}
              fill="none"
              stroke={bandColors[index]}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="butt"
            />
          )
        })}
        <text x={CENTER_X} y={CENTER_Y - 8} textAnchor="middle" className="reports-gauge__value">
          {averagePercent === null ? '—' : `${Math.round(averagePercent)}%`}
        </text>
        <text x={CENTER_X} y={CENTER_Y + 12} textAnchor="middle" className="reports-gauge__caption">
          Match mediu
        </text>
      </svg>

      <ul className="reports-gauge__legend">
        {bands.map((band, index) => (
          <li key={band.label} className="reports-gauge__legend-item">
            <span className="reports-gauge__legend-dot" style={{ background: bandColors[index] }} aria-hidden="true" />
            <span className="reports-gauge__legend-label">{band.label}</span>
            <span className="reports-gauge__legend-value">
              {band.count} ({band.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
