import { useEffect } from 'react'
import { useAppSettingQuery } from './useAppSettingQuery'
import type { GeneralPreferences } from './appSettingsTypes'

/**
 * Applies the persisted theme preference (general_preferences.theme) as
 * `data-theme` on <html>, app-wide (called once from AppLayout, which
 * wraps every protected route). RLS on app_settings is admin-only
 * (app_settings_select_admin), same as every other setting here, so
 * non-admin sessions simply get no row back and stay on the light
 * default — harmless, not an error.
 */
export function useThemePreferenceEffect() {
  const { data } = useAppSettingQuery<GeneralPreferences>('general_preferences')
  const theme = data?.value_json.theme ?? 'light'

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])
}
