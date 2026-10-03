import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartNoAxesCombined } from 'lucide-react'
import { transactionAmount, transactionIsIncome } from '../utils/financialCalculations'
import { localDateInputValue } from '../utils/localDate'

export default function CashFlowChart({ transactions }) {
  const [period, setPeriod] = useState(0)
  const { data, hasData, month } = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() + period, 1)
    const lastDay = period === 0 ? now.getDate() : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    const days = Array.from({ length: lastDay }, (_, i) => ({
      date: localDateInputValue(new Date(start.getFullYear(), start.getMonth(), i + 1)),
      day: i + 1, income: 0, expenses: 0,
    }))
    let hasData = false
    for (const transaction of transactions) {
      const day = days.find((item) => item.date === (transaction.transaction_date || transaction.date)?.slice(0, 10))
      if (!day) continue
      hasData = true
      day[transactionIsIncome(transaction) ? 'income' : 'expenses'] += transactionAmount(transaction)
    }
    return { data: days, hasData, month: start.toLocaleDateString('en-US', { month: 'short' }) }
  }, [transactions, period])

  return (
    <section className="card cash-flow-card">
      <div className="section-head">
        <div><h2>Cash flow</h2><p className="section-description">A little perspective on your daily spending.</p></div>
        <div className="segmented" aria-label="Cash flow period">
          <button aria-pressed={period === 0} className={period === 0 ? 'active' : ''} onClick={() => setPeriod(0)}>This month</button>
          <button aria-pressed={period === -1} className={period === -1 ? 'active' : ''} onClick={() => setPeriod(-1)}>Last month</button>
        </div>
      </div>
      <div className="cash-flow-legend"><span><i className="income" />Income</span><span><i className="expense" />Expenses</span></div>
      {hasData ? (
        <div className="cash-flow-chart" role="img" aria-label={`Daily income and expenses for ${month}; exact values are available in Transactions.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <defs><linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient><linearGradient id="expense-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.12} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={30} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(day) => `${month} ${day}`} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(n) => n >= 1000 ? `₹${n / 1000}k` : `₹${n}`} />
              <Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} labelFormatter={(day) => `${month} ${day}`} formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
              <Area type="monotone" name="Income" dataKey="income" stroke="var(--chart-1)" fill="url(#income-fill)" strokeWidth={2.5} />
              <Area type="monotone" name="Expenses" dataKey="expenses" stroke="var(--chart-2)" fill="url(#expense-fill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="cash-flow-empty"><ChartNoAxesCombined size={36} strokeWidth={1.4} /><h3>Your next chapter, visualized.</h3><p>Transactions from this month will bring this chart to life.</p></div>}
    </section>
  )
}
