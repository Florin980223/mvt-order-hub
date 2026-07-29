import { Info } from 'lucide-react'

interface DisabledSelectProps {
  label: string
  value: string
  title: string
  showInfoIcon?: boolean
}

/** A dropdown with no real setting behind it — see DisabledToggle's comment for the reasoning. */
export function DisabledSelect({ label, value, title, showInfoIcon }: DisabledSelectProps) {
  return (
    <label className="settings-field-row" title={title}>
      <span className="settings-field-row__label">
        {label}
        {showInfoIcon && <Info aria-hidden="true" size={13} className="settings-field-row__info" />}
      </span>
      <select className="settings-select" disabled value={value} onChange={() => {}}>
        <option value={value}>{value}</option>
      </select>
    </label>
  )
}
