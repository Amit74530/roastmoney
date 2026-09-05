import { Check, Lock } from 'lucide-react'
import { getAchievementData } from '../utils/financialInsights'

export default function Achievements({ transactions }) {
  const achievements = getAchievementData(transactions)
  return <><div className="page-intro compact-intro"><div><p className="eyebrow">PROOF OF HABITS / REAL DATA</p><h1>ACHIEVEMENTS.</h1><p className="lead">Small wins. Relentlessly documented.</p></div></div><div className="achievement-grid">{achievements.map((item) => <section className={`card achievement ${item.unlocked ? 'unlocked' : 'locked'}`} key={item.title}><div className="achievement-icon">{item.unlocked ? <Check size={20} /> : <Lock size={18} />}</div><span className="eyebrow">{item.unlocked ? 'UNLOCKED' : 'LOCKED'}</span><h2>{item.title}</h2><p>{item.description}</p><small className="progress-text">{item.progress}</small></section>)}</div></>
}
