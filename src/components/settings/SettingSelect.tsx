interface SettingSelectOption {
  value: string
  label: string
}

interface SettingSelectProps {
  label: string
  value: string
  options: SettingSelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  title?: string
}

/**
 * Real, wired counterpart to DisabledSelect — same markup/CSS classes
 * (settings-field-row / settings-select) used already by the confidence
 * threshold dropdown in SettingsPage.tsx, generalized to take an options
 * list instead of being hand-written per setting.
 */
export function SettingSelect({ label, value, options, onChange, disabled, title }: SettingSelectProps) {
  return (
    <label className="settings-field-row" title={title}>
      <span className="settings-field-row__label">{label}</span>
      <select
        className="settings-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
