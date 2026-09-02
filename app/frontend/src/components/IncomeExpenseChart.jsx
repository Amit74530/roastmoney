import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildIncomeExpenseTrend } from '../utils/analyticsCalculations'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function IncomeExpenseChart({ transactions }) {
  const data = buildIncomeExpenseTrend(transactions)
  return <section className="card analytics-chart-card"><div className="section-head"><div><span className="eyebrow">CASH IN / CASH OUT</span><h2>INCOME VS EXPENSES</h2></div><span className="chart-note">GROUPED BY MONTH</span></div>{data.length ? <div className="recharts-wrap"><ResponsiveContainer width="100%" height={280}><LineChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.07)" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#666d78', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#666d78', fontSize: 10 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} /><Tooltip contentStyle={{ background: '#151b25', border: '1px solid rgba(255,255,255,.12)', color: '#f2f1ec', fontSize: 12 }} formatter={(value) => money(value)} /><Legend iconType="line" wrapperStyle={{ color: '#969ba5', fontSize: 11 }} /><Line type="monotone" dataKey="income" name="Income" stroke="#dfff3f" strokeWidth={2} dot={{ fill: '#dfff3f', r: 3 }} /><Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ff8a3d" strokeWidth={2} dot={{ fill: '#ff8a3d', r: 3 }} /></LineChart></ResponsiveContainer></div> : <div className="chart-empty">NOT ENOUGH EVIDENCE FOR A TREND.</div>}</section>
}
