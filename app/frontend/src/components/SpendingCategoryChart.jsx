import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { buildCategoryBreakdown } from '../utils/analyticsCalculations'

const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--text-muted)']
const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function SpendingCategoryChart({ transactions }) {
  const data = buildCategoryBreakdown(transactions)
  return <section className="card analytics-chart-card category-chart"><div className="section-head"><div><span className="eyebrow">EXPENSES ONLY</span><h2>SPENDING BY CATEGORY</h2></div><span className="chart-note">WHERE IT WENT</span></div>{data.length ? <><div className="category-chart-body"><ResponsiveContainer width="55%" height={220}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={2} stroke="none">{data.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12 }} formatter={(value) => money(value)} /></PieChart></ResponsiveContainer><div className="category-legend">{data.map((entry, index) => <div key={entry.name}><i style={{ background: colors[index % colors.length] }} /> <span>{entry.name}</span><b>{money(entry.value)}</b></div>)}</div></div></> : <div className="chart-empty">NO EXPENSE DATA YET.</div>}</section>
}
