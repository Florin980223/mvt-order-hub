const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: 'În așteptare',
  sent: 'Trimis',
  succeeded: 'Reușit',
  failed: 'Eșuat',
}

export function formatSubmissionStatus(status: string): string {
  return SUBMISSION_STATUS_LABELS[status] ?? status
}
