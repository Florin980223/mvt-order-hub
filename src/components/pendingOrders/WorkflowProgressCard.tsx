import { Check, Sparkles } from 'lucide-react'
import type { OrderRow } from '../../lib/emails/types'
import { countLowConfidenceFields } from '../../lib/orders/orderFields'
import { useConfidenceThresholdQuery, DEFAULT_CONFIDENCE_THRESHOLD } from '../../lib/settings/useConfidenceThresholdQuery'

const STEPS = ['Primire email', 'Citire atașament', 'Extragere AI', 'Pregătire import']

interface WorkflowProgressCardProps {
  // The selected order's own confidence/validation summary, shown in the
  // green box below the steps (figura3-comenzi-asteptare.png) — this was
  // missing entirely from the first pass of this component. Null while
  // nothing is selected yet.
  order: OrderRow | null
}

/**
 * Static per this page's scope: every order shown here is status
 * 'needs_validation', meaning it has always already passed steps 1-3 and
 * is always sitting at step 4 (pending import approval) — no prop needed
 * since nothing on this page varies that pattern today.
 */
export function WorkflowProgressCard({ order }: WorkflowProgressCardProps) {
  const { data: confidenceThresholdSetting } = useConfidenceThresholdQuery()
  const confidenceThreshold = confidenceThresholdSetting?.value_json.threshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  const overallPercent = order?.confidence_overall != null ? Math.round(order.confidence_overall * 100) : null
  const lowConfidenceCount = order ? countLowConfidenceFields(order, confidenceThreshold) : 0

  return (
    <div className="pending-orders-workflow">
      <h2 className="pending-orders-workflow__title">Workflow AI – Procesare comandă</h2>
      <ol className="pending-orders-workflow__steps">
        {STEPS.map((step, index) => {
          const isCurrent = index === STEPS.length - 1
          return (
            <li
              key={step}
              className={`pending-orders-workflow__step${isCurrent ? ' pending-orders-workflow__step--current' : ' pending-orders-workflow__step--done'}`}
            >
              <span className="pending-orders-workflow__marker">
                {/* Current step's marker is a bare empty circle in figura3 —
                    no number, no icon — unlike a typical "step N" stepper. */}
                {!isCurrent && <Check aria-hidden="true" size={14} />}
              </span>
              <span className="pending-orders-workflow__label">{step}</span>
            </li>
          )
        })}
      </ol>
      {overallPercent != null && (
        <div className="pending-orders-workflow__summary">
          <Sparkles aria-hidden="true" size={16} />
          <p>
            AI a extras datele cu {overallPercent}% încredere.
            <br />
            {lowConfidenceCount} câmpuri necesită validare.
          </p>
        </div>
      )}
    </div>
  )
}
