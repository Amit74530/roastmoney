export const incomeCategories = ['Salary', 'Freelance', 'Business', 'Investment', 'Other']
export const expenseCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other']
export const paymentMethods = ['UPI', 'Card', 'Net banking', 'Wallet', 'Cash', 'Other']

export function categoriesForType(type) {
  return type === 'income' ? incomeCategories : expenseCategories
}

export function normalizeCategory(type, category) {
  const options = categoriesForType(type)
  if (options.includes(category)) return category
  return type === 'income' ? 'Other' : 'Other'
}
