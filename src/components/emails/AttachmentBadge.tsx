import { getFileTypeMeta } from '../../lib/emails/fileType'

interface AttachmentBadgeProps {
  mimeType: string
  filename: string
}

export function AttachmentBadge({ mimeType, filename }: AttachmentBadgeProps) {
  const { label, className } = getFileTypeMeta(mimeType, filename)
  return <span className={`emails-file-badge ${className}`}>{label}</span>
}
