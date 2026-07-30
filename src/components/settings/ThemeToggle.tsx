import { Moon, Sun } from 'lucide-react'
import type { GeneralPreferences } from '../../lib/settings/appSettingsTypes'

interface ThemeToggleProps {
  value: GeneralPreferences['theme']
  onChange: (theme: GeneralPreferences['theme']) => void
  disabled?: boolean
}

/**
 * Persists a real theme preference (general_preferences.theme, part of
 * app_settings) and applies it as `data-theme="dark"` on <html>
 * (see useThemePreferenceEffect, wired from AppLayout) — but no full
 * dark-mode visual design exists in this app. Only src/index.css's
 * prefers-color-scheme block (--text/--bg/--border) reacts to it; the
 * --color-* brand tokens used by most surfaces stay pinned light
 * regardless (see that file's own comment). Selecting "Întunecată" is
 * therefore real, saved, and has a genuine (if limited) visual effect —
 * not a no-op — but a proper dark palette is a separate, later pass.
 */
export function ThemeToggle({ value, onChange, disabled }: ThemeToggleProps) {
  return (
    <div className="settings-field-row">
      <span className="settings-field-row__label">Temă interfață</span>
      <div className="settings-theme-toggle">
        <button
          type="button"
          className={
            value === 'light' ? 'settings-theme-toggle__btn settings-theme-toggle__btn--active' : 'settings-theme-toggle__btn'
          }
          disabled={disabled}
          onClick={() => onChange('light')}
        >
          <Sun aria-hidden="true" size={12} />
          Luminoasă
        </button>
        <button
          type="button"
          className={
            value === 'dark' ? 'settings-theme-toggle__btn settings-theme-toggle__btn--active' : 'settings-theme-toggle__btn'
          }
          disabled={disabled}
          title="Doar culorile de bază (text/fundal/borduri) răspund la acest mod — restul interfeței rămâne deschisă la culoare până la un pas de design dedicat"
          onClick={() => onChange('dark')}
        >
          <Moon aria-hidden="true" size={12} />
          Întunecată
        </button>
      </div>
    </div>
  )
}
