// Database types for Smart Doc Chaser

export type DocumentStatus = 'pending' | 'completed' | 'expired'

export interface DocumentRequest {
  id: string
  broker_id: string | null
  client_name: string
  client_phone: string
  client_email: string | null
  document_type: string
  deadline: string | null
  status: DocumentStatus
  upload_token: string
  upload_link: string | null
  file_url: string | null
  created_at: string
  uploaded_at: string | null
  last_reminder_at: string | null
  reminders_stopped: boolean
}

// Form submission types
export interface CreateRequestForm {
  client_name: string
  client_phone: string
  client_email?: string
  document_type: string
  deadline?: string
}

// Common document types for insurance
export const DOCUMENT_TYPES = [
  'Proof of Income',
  'ID / Driver\'s License',
  'Social Security Card',
  'Proof of Address',
  'Immigration Documents',
  'Employer Coverage Letter',
  'SEP Documentation',
  'Tax Return',
  'Pay Stub',
  'Bank Statement',
  'Other',
] as const

export type DocumentType = typeof DOCUMENT_TYPES[number]
