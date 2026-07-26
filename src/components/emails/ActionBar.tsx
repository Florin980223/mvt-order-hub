const DISABLED_TITLE = 'Disponibil din Faza 6'

/**
 * All 4 buttons are visually specified by the brief's mockup but their
 * real behavior is Phase 6 — disabled here rather than omitted, since the
 * brief requires this exact action bar to always be present.
 */
export function ActionBar() {
  return (
    <div className="emails-action-bar">
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--primary"
        disabled
        title={DISABLED_TITLE}
      >
        Salvează &amp; Importă în AscendTMS
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--amber"
        disabled
        title={DISABLED_TITLE}
      >
        Corectează manual
      </button>
      <button type="button" className="emails-action-bar__btn emails-action-bar__btn--red" disabled title={DISABLED_TITLE}>
        Respinge email
      </button>
      <button
        type="button"
        className="emails-action-bar__btn emails-action-bar__btn--blue"
        disabled
        title={DISABLED_TITLE}
      >
        Trimite confirmare client
      </button>
    </div>
  )
}
