import { Check } from 'lucide-react'

const STEPS = ['Primire email', 'Citire atașament', 'Extragere AI', 'Pregătire import']

/**
 * Static per this page's scope: every order shown here is status
 * 'needs_validation', meaning it has always already passed steps 1-3 and
 * is always sitting at step 4 (pending import approval) — no prop needed
 * since nothing on this page varies that pattern today.
 */
export function WorkflowProgressCard() {
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
                {isCurrent ? index + 1 : <Check aria-hidden="true" size={14} />}
              </span>
              {step}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
