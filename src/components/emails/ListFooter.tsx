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
}

/** Shared by Dashboard's and EmailsPage's list columns (figura1/figura2's identical footer row). */
export function ListFooter({ dataUpdatedAt, rangeStart, rangeEnd, total, currentPage, totalPages, onPrevPage, onNextPage }: ListFooterProps) {
  return (
    <div className="emails-list-footer">
      <span className="emails-list-footer__updated">
        <RefreshCw aria-hidden="true" size={13} />
        {formatUpdatedRelative(dataUpdatedAt)}
      </span>
      <div className="emails-list-footer__pagination">
        <span>
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
