export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mtn_money', label: 'MTN Money' }
]

export const getPaymentMethodLabel = (value) => {
  const method = PAYMENT_METHODS.find((item) => item.value === value)
  if (method) return method.label
  if (!value) return 'Unknown'
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}
