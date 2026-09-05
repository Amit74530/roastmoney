import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildIncomeExpenseTrend } from '../utils/analyticsCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function IncomeExpenseChart({ transactions }) {
  const data = buildIncomeExpenseTrend(transactions)
  return <section className="card analytics-chart-card"><div className="section-head"><div><span className="eyebrow">CASH IN / CASH OUT</span><h2>INCOME VS EXPENSES</h2></div><span className="chart-note">GROUPED BY MONTH</span></div>{data.length ? <div className="recharts-wrap"><ResponsiveContainer width="100%" height={280}><LineChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="var(--chart-grid)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }} formatter={(value) => money(value)} /><Legend iconType="line" wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 11 }} /><Line type="monotone" dataKey="income" name="Income" stroke="var(--chart-1)" strokeWidth={2} dot={{ fill: 'var(--chart-1)', r: 3 }} /><Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--chart-2)" strokeWidth={2} dot={{ fill: 'var(--chart-2)', r: 3 }} /></LineChart></ResponsiveContainer></div> : <div className="chart-empty">NOT ENOUGH EVIDENCE FOR A TREND.</div>}</section>
}
