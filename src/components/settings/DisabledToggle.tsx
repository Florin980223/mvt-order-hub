interface DisabledToggleProps {
  label: string
  checked: boolean
  title: string
}

/**
 * A toggle with no real setting behind it — rendered matching
 * figura6-setari.png's shown position (most default to ON in the
 * mockup), disabled, with a tooltip explaining it isn't configurable
 * yet. Not a fake persisted value: nothing is read or written anywhere.
 */
export function DisabledToggle({ label, checked, title }: DisabledToggleProps) {
  return (
    <label className="settings-toggle-row" title={title}>
      <span className="settings-toggle-row__label">{label}</span>
      <span className="settings-toggle">
        <input type="checkbox" checked={checked} disabled readOnly />
        <span className="settings-toggle__track" aria-hidden="true">
          <span className="settings-toggle__thumb" />
        </span>
      </span>
    </label>
  )
}
