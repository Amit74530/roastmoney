import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getSpendingPersonality, getWrappedData } from '../utils/financialInsights'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`

export default function Wrapped({ transactions }) {
  const [slide, setSlide] = useState(0)
  const data = getWrappedData(transactions)
  const personality = getSpendingPersonality(transactions)
  const slides = transactions.length ? [['TOTAL INCOME', money(data.summary.totalIncome), 'Money in, accounted for.'], ['TOTAL EXPENSES', money(data.summary.totalExpenses), 'The evidence is compelling.'], ['BIGGEST CATEGORY', data.topCategory[0].toUpperCase(), money(data.topCategory[1])], ['FINANCIAL PERSONALITY', personality.title, personality.description], ['FINAL VERDICT', data.summary.totalBalance >= 0 ? 'YOU ARE SOLVENT.' : 'YOUR WALLET NEEDS A MEETING.', 'Based on the transactions you logged.']] : [['YOUR MONEY WRAPPED', 'NOTHING YET', 'Add a transaction to start the recap.']]
  const current = slides[slide]
  const move = (amount) => setSlide((value) => Math.max(0, Math.min(slides.length - 1, value + amount)))
  return <div className="wrapped"><div className="wrapped-top"><span className="eyebrow">YOUR MONEY WRAPPED / REAL DATA</span><span className="slide-count">0{slide + 1} / 0{slides.length}</span></div><div className="wrapped-stage"><span className="eyebrow">{current[0]}</span><strong>{current[1]}</strong><p>{current[2]}</p><div className="wrapped-line" /></div><div className="wrapped-controls"><button className="button outline" disabled={slide === 0} onClick={() => move(-1)}><ArrowLeft size={16} /> PREVIOUS</button><div className="slide-dots">{slides.map((_, index) => <i className={index === slide ? 'active' : ''} key={index} />)}</div><button className="button lime" disabled={slide === slides.length - 1} onClick={() => move(1)}>NEXT <ArrowRight size={16} /></button></div></div>
}
