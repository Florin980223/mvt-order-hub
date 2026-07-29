export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface StatusDonutChartProps {
  segments: DonutSegment[]
  centerLabel: string
  centerValue: string
}

const SIZE = 140
const RADIUS = 52
const STROKE_WIDTH = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Hand-rolled SVG donut (stroke-dasharray technique) — no charting library exists in this codebase and none was approved to add. */
export function StatusDonutChart({ segments, centerLabel, centerValue }: StatusDonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  let cumulativeFraction = 0

  return (
    <div className="reports-donut">
      <svg
        className="reports-donut__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((segment) => {
            const fraction = total === 0 ? 0 : segment.value / total
            const dashLength = fraction * CIRCUMFERENCE
            const dashOffset = -cumulativeFraction * CIRCUMFERENCE
            cumulativeFraction += fraction
            if (fraction === 0) return null
            return (
              <circle
                key={segment.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={segment.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
                strokeDashoffset={dashOffset}
              />
            )
          })}
        </g>
        <text x={SIZE / 2} y={SIZE / 2 - 6} textAnchor="middle" className="reports-donut__center-label">
          {centerLabel}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="reports-donut__center-value">
          {centerValue}
        </text>
      </svg>

      <ul className="reports-donut__legend">
        {segments.map((segment) => {
          const percent = total === 0 ? 0 : Math.round((segment.value / total) * 1000) / 10
          return (
            <li key={segment.label} className="reports-donut__legend-item">
              <span className="reports-donut__legend-dot" style={{ background: segment.color }} aria-hidden="true" />
              <span className="reports-donut__legend-label">{segment.label}</span>
              <span className="reports-donut__legend-value">
                {segment.value} ({percent.toFixed(1).replace('.', ',')}%)
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
