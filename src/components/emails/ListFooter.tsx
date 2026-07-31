import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { formatUpdatedRelative } from '../../lib/emails/format'

interface ListFooterProps {
  dataUpdatedAt: number
  rangeStart: number
  rangeEnd: number
  total: number
  currentPage: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
  // When provided, "Actualizat..." renders as a real refresh button instead
  // of static text. Optional (falls back to the old plain <span>) for
  // back-compat, though all 3 current call sites (Dashboard/Emails/SentOrders
  // Page) now pass it, so that fallback path is effectively unused today.
  onRefresh?: () => void
  // Spins the RefreshCw icon while a refetch triggered by onRefresh is in
  // flight — pass the owning query hook's own isFetching/isRefetching.
  isRefreshing?: boolean
}

/** Shared by Dashboard's, EmailsPage's and SentOrdersPage's list columns (figura1/figura2/figura4's identical footer row). */
export function ListFooter({
  dataUpdatedAt,
  rangeStart,
  rangeEnd,
  total,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onRefresh,
  isRefreshing,
}: ListFooterProps) {
  const updatedContent = (
    <>
      <RefreshCw
        aria-hidden="true"
        size={13}
        className={isRefreshing ? 'emails-list-footer__updated-icon--spinning' : undefined}
      />
      {formatUpdatedRelative(dataUpdatedAt)}
    </>
  )

  return (
    <div className="emails-list-footer">
      {onRefresh ? (
        <button
          type="button"
          className="emails-list-footer__updated emails-list-footer__updated--button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Reîmprospătează lista"
        >
          {updatedContent}
        </button>
      ) : (
        <span className="emails-list-footer__updated">{updatedContent}</span>
      )}
      <div className="emails-list-footer__pagination">
        <span className="emails-list-footer__range">
          {total === 0 ? 0 : rangeStart}-{rangeEnd} din {total}
        </span>
        <button
          type="button"
          className="emails-list-footer__page-btn"
          aria-label="Pagina anterioară"
          disabled={currentPage === 0}
          onClick={onPrevPage}
        >
          <ChevronLeft aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          className="emails-list-footer__page-btn"
          aria-label="Pagina următoare"
          disabled={currentPage >= totalPages - 1}
          onClick={onNextPage}
        >
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  )
}
