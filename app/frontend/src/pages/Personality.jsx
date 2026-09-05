import { getSpendingPersonality } from '../utils/financialInsights'

export default function Personality({ transactions }) {
  const result = getSpendingPersonality(transactions)
  return <><div className="page-intro compact-intro"><div><p className="eyebrow">THE DIAGNOSIS / REAL DATA</p><h1>YOUR FINANCIAL PERSONALITY.</h1><p className="lead">Patterns, habits, and the evidence you supplied willingly.</p></div></div><section className="card personality-hero"><div><span className="eyebrow">PRIMARY TYPE / 01</span><h2>{result.title}</h2><p>{result.description}</p></div><div className="score-ring"><strong>{result.chaos}</strong><small>CHAOS<br />INDEX</small></div></section><div className="scores">{[['IMPULSE', result.impulse], ['DISCIPLINE', result.discipline], ['CHAOS', result.chaos]].map(([label, value]) => <section className="card" key={label}><span className="eyebrow">{label}</span><strong>{value}%</strong><div className="progress"><i style={{ width: `${value}%` }} /></div></section>)}</div></>
}
