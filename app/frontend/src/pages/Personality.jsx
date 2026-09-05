import { getSpendingPersonality } from '../utils/financialInsights'

export default function Personality({ transactions }) {
  const result = getSpendingPersonality(transactions)
  return (
    <>
      <div className="page-intro compact-intro">
        <div>
          <p className="eyebrow">The diagnosis</p>
          <h1>Your financial personality.</h1>
          <p className="lead">Patterns, habits, and the evidence you supplied willingly.</p>
        </div>
      </div>
      <section className="card personality-hero">
        <div>
          <span className="eyebrow">Primary type / 01</span>
          <h2>{result.title}</h2>
          <p className="roast-quote">{result.description}</p>
        </div>
        <div className="score-ring">
          <strong>{result.chaos}</strong>
          <small>Chaos<br />index</small>
        </div>
      </section>
      <div className="scores">
        {[['Impulse', result.impulse], ['Discipline', result.discipline], ['Chaos', result.chaos]].map(([label, value]) => (
          <section className="card" key={label}>
            <span className="eyebrow">{label}</span>
            <strong>{value}%</strong>
            <div className="progress"><i style={{ width: `${value}%` }} /></div>
          </section>
        ))}
      </div>
    </>
  )
}
