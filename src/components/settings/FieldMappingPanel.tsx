import { useState } from 'react'
import { ORDER_FIELD_SECTIONS } from '../../lib/orders/orderFields'
import type { AscendFieldMapping } from '../../lib/settings/appSettingsTypes'

interface FieldMappingPanelProps {
  value: AscendFieldMapping
  onSave: (value: AscendFieldMapping) => void
  onCancel: () => void
  isSaving: boolean
  error?: string | null
}

// Reduced, honest version of "Configurează maparea": a flat list of this
// app's own order fields (src/lib/orders/orderFields.ts, already the
// single source of truth for order field names/labels elsewhere in the
// app) each with a free-text input for the corresponding AscendTMS field
// name — not a drag-and-drop mapper. external_reference_id is submission
// metadata rather than an AI-extracted/mappable field, so it's excluded.
const MAPPABLE_FIELDS = ORDER_FIELD_SECTIONS.flatMap((section) => section.fields).filter(
  (field) => field.trackConfidence !== false,
)

export function FieldMappingPanel({ value, onSave, onCancel, isSaving, error }: FieldMappingPanelProps) {
  const [draft, setDraft] = useState<Record<string, string>>(value.mappings)

  return (
    <div className="settings-field-mapping">
      <p className="settings-field-mapping__hint">
        Asociază fiecare câmp din comandă cu numele câmpului corespunzător din AscendTMS. Lasă gol pentru a folosi numele
        implicit.
      </p>
      <div className="settings-field-mapping__list">
        {MAPPABLE_FIELDS.map((field) => (
          <label key={field.fieldName} className="settings-field-mapping__row">
            <span className="settings-field-mapping__label">{field.label}</span>
            <input
              type="text"
              className="settings-text-input"
              placeholder={field.fieldName}
              value={draft[field.fieldName] ?? ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, [field.fieldName]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {error && <p className="settings-inline-state settings-inline-state--error">{error}</p>}
      <div className="settings-field-mapping__actions">
        <button
          type="button"
          className="settings-btn"
          onClick={() => onSave({ mappings: draft })}
          disabled={isSaving}
        >
          {isSaving ? 'Se salvează...' : 'Salvează maparea'}
        </button>
        <button type="button" className="settings-btn settings-btn--outline" onClick={onCancel} disabled={isSaving}>
          Anulează
        </button>
      </div>
    </div>
  )
}
