export interface MPPreferenceItem {
  title: string
  quantity: number
  unit_price: number
  description?: string
}

export interface MPCreatePreferenceInput {
  items: MPPreferenceItem[]
  payerEmail: string
  payerFirstName?: string
  payerLastName?: string
  externalReference: string
  backUrls: { success: string; failure: string; pending: string }
  notificationUrl: string
  statementDescriptor?: string
}

export interface MPPreferenceResponse {
  id: string
  init_point: string
  sandbox_init_point: string
}

export interface MPPayment {
  id: number
  status: 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back' | string
  status_detail: string
  external_reference: string | null
  transaction_amount: number
}
