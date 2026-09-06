import { categoriesForType, paymentMethods } from './transactionCategories'

const emptyForm = () => ({
  title: '',
  merchant: '',
  amount: '',
  type: 'expense',
  category: '',
  transaction_date: '',
  time: '',
  payment_method: '',
  reference_id: '',
  description: '',
})

export function mapExtractionToForm(extraction) {
  const type = extraction?.type === 'income' || extraction?.type === 'expense' ? extraction.type : 'expense'
  const categories = categoriesForType(type)
  const category = categories.includes(extraction?.category) ? extraction.category : ''
  const paymentMethod = paymentMethods.includes(extraction?.payment_method) ? extraction.payment_method : ''
  const merchant = extraction?.merchant || ''

  return {
    ...emptyForm(),
    title: extraction?.title || merchant,
    merchant,
    amount: extraction?.amount == null ? '' : String(extraction.amount),
    type,
    category,
    transaction_date: extraction?.date || '',
    time: extraction?.time || '',
    payment_method: paymentMethod,
    reference_id: extraction?.reference_id || '',
    description: extraction?.notes || '',
  }
}

export function confidenceCopy(extraction) {
  const value = Number(extraction?.confidence)
  if (!extraction || extraction.unclear || !Number.isFinite(value) || value < 0.55) {
    return { tone: 'low', label: 'Low confidence', detail: 'Check merchant and amount before saving.' }
  }
  if (value < 0.8) {
    return { tone: 'review', label: 'Needs review', detail: 'Some fields were unclear. Confirm them before saving.' }
  }
  return { tone: 'high', label: 'High confidence', detail: 'The payment looks readable. You can still edit anything.' }
}

export { emptyForm }
