import { generate, statusLabel } from './roastEngine'
import { computeAchievements, computePersonality, computeRoastScore, roastScoreLabel } from './personalityEngine'
import { isExpenseTransaction, toEngineExpenses, toEngineTransaction } from './transactionAdapter'

const PRESET_SCALE = { MILD: 0.6, SAVAGE: 1, BRUTAL: 1.25 }
const PRESET_OFFSET = { MILD: 0, SAVAGE: 0, BRUTAL: 7 }

const normalizePreset = (value) => {
  const preset = String(value || 'SAVAGE').toUpperCase()
  return PRESET_SCALE[preset] ? preset : 'SAVAGE'
}

export function generateExpenseRoast(transaction, history = [], intensityPreset = 'SAVAGE') {
  if (!transaction || !isExpenseTransaction(transaction)) return null

  const preset = normalizePreset(intensityPreset)
  const engineTx = toEngineTransaction(transaction)
  const engineHistory = toEngineExpenses(history)
  const result = generate(engineTx, { history: engineHistory }, PRESET_OFFSET[preset])
  const intensity = Math.max(1, Math.min(100, Math.round(result.intensity * PRESET_SCALE[preset])))

  return {
    ...result,
    intensity,
    label: statusLabel(intensity),
  }
}

export function getPersonalityView(transactions = []) {
  const expenses = toEngineExpenses(transactions)
  const result = computePersonality(expenses)
  if (!result) {
    return {
      title: 'THE FINANCIAL MYSTERY',
      description: 'No spending evidence yet. A surprisingly clean record.',
      impulse: 0,
      discipline: 100,
      chaos: 0,
      roastScore: 0,
      roastLabel: 'Responsible',
    }
  }

  const roastScore = computeRoastScore(expenses)
  return {
    title: result.title,
    description: result.line,
    impulse: result.traits.impulse,
    discipline: result.traits.discipline,
    chaos: result.traits.chaos,
    roastScore,
    roastLabel: roastScoreLabel(roastScore),
    diagnosis: result.diagnosis,
  }
}

export function getAchievementView(transactions = []) {
  return computeAchievements(toEngineExpenses(transactions)).map((item) => ({
    title: item.title,
    description: item.description,
    unlocked: item.unlocked,
    progress: item.unlocked ? 'UNLOCKED' : `${Math.round((item.progress || 0) * 100)}%`,
  }))
}
