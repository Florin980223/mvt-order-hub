import type { LucideIcon } from 'lucide-react'

interface IntegrationRowProps {
  icon: LucideIcon
  iconVariant: 'blue' | 'teal' | 'violet'
  name: string
  // AI Engine's row has no separate status line, unlike Outlook/AscendTMS
  // — confirmed at native resolution, not an oversight.
  statusText?: string
  action: React.ReactNode
  children: React.ReactNode
  active: boolean
}

/** figura6-setari.png's "Conectări și Integrări" row shape, shared by Outlook/AscendTMS/AI Engine. */
export function IntegrationRow({ icon: Icon, iconVariant, name, statusText, action, children, active }: IntegrationRowProps) {
  return (
    <div className="settings-integration-row">
      <span className={`settings-integration-row__icon settings-integration-row__icon--${iconVariant}`}>
        <Icon aria-hidden="true" size={16} />
      </span>
      <div className="settings-integration-row__body">
        <span className="settings-integration-row__name">{name}</span>
        {statusText && <p className="settings-integration-row__status">{statusText}</p>}
        <div className="settings-integration-row__details">{children}</div>
      </div>
      <div className="settings-integration-row__trailing">
        {action}
        <span className="settings-integration-row__active">
          <span
            className={`settings-integration-row__dot ${active ? 'settings-integration-row__dot--active' : ''}`}
            aria-hidden="true"
          />
          {active ? 'Activ' : 'Inactiv'}
        </span>
      </div>
    </div>
  )
}
