import { ORDER_FIELD_SECTIONS, latestSourceFor } from '../../lib/orders/orderFields'
import type { OrderCorrection } from '../../lib/orders/useOrderCorrection'
import type { OrderRow } from '../../lib/emails/types'

interface PendingOrderFieldsProps {
  order: OrderRow
  correction?: OrderCorrection
}

export function PendingOrderFields({ order, correction }: PendingOrderFieldsProps) {
  const isEditing = correction?.isEditing ?? false

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
                    {source?.confidence != null && (
                      <span className="pending-orders-fields__confidence">
                        {' '}
                        ({Math.round(source.confidence * 100)}%)
                      </span>
                    )}
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
