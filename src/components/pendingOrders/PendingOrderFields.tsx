import { ORDER_FIELD_SECTIONS, latestSourceFor } from '../../lib/orders/orderFields'
import type { OrderRow } from '../../lib/emails/types'

interface PendingOrderFieldsProps {
  order: OrderRow
}

export function PendingOrderFields({ order }: PendingOrderFieldsProps) {
  return (
    <div className="pending-orders-fields">
      {ORDER_FIELD_SECTIONS.map((section) => (
        <section key={section.title} className="pending-orders-fields__section">
          <h3>{section.title}</h3>
          <div className="pending-orders-fields__grid">
            {section.fields.map((field) => {
              const source = latestSourceFor(order.order_field_sources, field.fieldName)
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
