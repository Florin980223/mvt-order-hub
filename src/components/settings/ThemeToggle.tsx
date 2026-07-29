import { Moon, Sun } from 'lucide-react'

/**
 * No manual theme switch exists anywhere in the app — only OS-level
 * `prefers-color-scheme` CSS (src/index.css). "Luminoasă" is shown
 * selected because that's honestly the only mode this app supports
 * today, not a fabricated default; "Întunecată" is present (matching the
 * mockup) but disabled.
 */
export function ThemeToggle() {
  return (
    <div className="settings-field-row">
      <span className="settings-field-row__label">Temă interfață</span>
      <div className="settings-theme-toggle">
        <button type="button" className="settings-theme-toggle__btn settings-theme-toggle__btn--active" disabled>
          <Sun aria-hidden="true" size={14} />
          Luminoasă
        </button>
        <button
          type="button"
          className="settings-theme-toggle__btn"
          disabled
          title="Modul întunecat nu este încă disponibil ca preferință manuală — aplicația urmează doar preferința sistemului de operare"
        >
          <Moon aria-hidden="true" size={14} />
          Întunecată
        </button>
      </div>
    </div>
  )
}
