export interface AreaLineChartSeries {
  label: string
  color: string
  values: number[]
  /** Only the first series gets a filled area under the line, per figura5. */
  filled?: boolean
}

interface AreaLineChartProps {
  dates: string[]
  series: AreaLineChartSeries[]
}

const WIDTH = 760
const HEIGHT = 220
const PADDING_LEFT = 34
const PADDING_RIGHT = 14
const PADDING_BOTTOM = 24
const PADDING_TOP = 10
const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT
const PLOT_HEIGHT = HEIGHT - PADDING_BOTTOM - PADDING_TOP

/** dates are already `YYYY-MM-DD` day-bucket keys — figura5's x-axis shows short `DD.MM`, not the full date. */
function formatDayLabel(isoDate: string): string {
  return `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}`
}

/** Hand-rolled SVG chart — no charting library exists in this codebase and none was approved to add (Phase 7f-1 planning). */
export function AreaLineChart({ dates, series }: AreaLineChartProps) {
  const maxValue = Math.max(1, ...series.flatMap((s) => s.values))
  const yMax = Math.ceil(maxValue / 20) * 20 || 20
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(yMax * fraction))

  const xForIndex = (index: number) =>
    dates.length <= 1 ? PADDING_LEFT : PADDING_LEFT + (index / (dates.length - 1)) * PLOT_WIDTH
  const yForValue = (value: number) => PADDING_TOP + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT

  const linePath = (values: number[]) =>
    values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(value)}`).join(' ')

  const areaPath = (values: number[]) => {
    const top = linePath(values)
    const baseline = yForValue(0)
    return `${top} L ${xForIndex(values.length - 1)} ${baseline} L ${xForIndex(0)} ${baseline} Z`
  }

  // Every 2nd date label once there are more than ~15 points — mirrors
  // figura5's own every-other-day labeling for its 23-day default range.
  const labelStep = dates.length > 15 ? Math.ceil(dates.length / 12) : 1

  return (
    <svg
      className="reports-area-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Comenzi procesate pe zi"
    >
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING_LEFT}
            x2={WIDTH}
            y1={yForValue(tick)}
            y2={yForValue(tick)}
            className="reports-area-chart__gridline"
          />
          <text x={0} y={yForValue(tick) + 4} className="reports-area-chart__axis-label">
            {tick}
          </text>
        </g>
      ))}

      {series.map((s) =>
        s.filled ? <path key={`${s.label}-area`} d={areaPath(s.values)} fill={s.color} opacity={0.15} /> : null,
      )}
      {series.map((s) => (
        <path key={`${s.label}-line`} d={linePath(s.values)} fill="none" stroke={s.color} strokeWidth={2} />
      ))}
      {series.map((s) =>
        s.values.map((value, index) => (
          <circle key={`${s.label}-${index}`} cx={xForIndex(index)} cy={yForValue(value)} r={2.5} fill={s.color} />
        )),
      )}

      {dates.map((date, index) =>
        index % labelStep === 0 ? (
          <text
            key={date}
            x={xForIndex(index)}
            y={HEIGHT - 4}
            className="reports-area-chart__axis-label reports-area-chart__axis-label--x"
          >
            {formatDayLabel(date)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
