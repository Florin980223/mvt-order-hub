interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  title?: string
}

/**
 * Real, wired counterpart to DisabledToggle — same markup/CSS classes
 * (settings-toggle-row / settings-toggle), just backed by an actual
 * checked value and onChange instead of a hardcoded, disabled checkbox.
 */
export function Toggle({ label, checked, onChange, disabled, title }: ToggleProps) {
  return (
    <label className="settings-toggle-row" title={title}>
      <span className="settings-toggle-row__label">{label}</span>
      <span className="settings-toggle">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="settings-toggle__track" aria-hidden="true">
          <span className="settings-toggle__thumb" />
        </span>
      </span>
    </label>
  )
}
