export type FileKind = 'pdf' | 'xlsx' | 'csv' | 'other'

export interface FileTypeMeta {
  label: string
  className: string
  kind: FileKind
}

export function getFileTypeMeta(mimeType: string, filename: string): FileTypeMeta {
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
    return { label: 'PDF', className: 'emails-file-badge--pdf', kind: 'pdf' }
  }
  if (mimeType.includes('spreadsheet') || filename.endsWith('.xlsx')) {
    return { label: 'XLSX', className: 'emails-file-badge--xlsx', kind: 'xlsx' }
  }
  if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
    return { label: 'CSV', className: 'emails-file-badge--csv', kind: 'csv' }
  }
  return { label: 'Fișier', className: 'emails-file-badge--neutral', kind: 'other' }
}
