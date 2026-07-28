import { ORDER_FIELD_SECTIONS, latestSourceFor } from '../../lib/orders/orderFields'
import type { OrderCorrection } from '../../lib/orders/useOrderCorrection'
import type { OrderRow } from '../../lib/emails/types'
import { FieldConfidenceIndicator } from '../emails/FieldConfidenceIndicator'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'

interface PendingOrderFieldsProps {
  order: OrderRow
  correction?: OrderCorrection
}

export function PendingOrderFields({ order, correction }: PendingOrderFieldsProps) {
  const isEditing = correction?.isEditing ?? false
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD

  return (
    <div className="pending-orders-fields">
      {ORDER_FIELD_SECTIONS.map((section) => (
        <section key={section.title} className="pending-orders-fields__section">
          <h3>{section.title}</h3>
          <div className="pending-orders-fields__grid">
            {section.fields.map((field) => {
              const source = latestSourceFor(order.order_field_sources, field.fieldName)

              if (isEditing && field.inputType && correction) {
                return (
                  <div className="pending-orders-fields__item" key={field.fieldName}>
                    <label className="pending-orders-fields__label" htmlFor={`correct-${field.fieldName}`}>
                      {field.label}
                    </label>
                    <input
                      id={`correct-${field.fieldName}`}
                      type={field.inputType === 'datetime' ? 'datetime-local' : field.inputType}
                      value={correction.draftValues[field.fieldName] ?? ''}
                      onChange={(e) => correction.updateDraftField(field.fieldName, e.target.value)}
                    />
                  </div>
                )
              }

              return (
                <div className="pending-orders-fields__item" key={field.fieldName}>
                  <span className="pending-orders-fields__label">{field.label}</span>
                  <span className="pending-orders-fields__value">
                    {field.value(order)}
                    <FieldConfidenceIndicator confidence={source?.confidence ?? null} threshold={confidenceThreshold} />
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
