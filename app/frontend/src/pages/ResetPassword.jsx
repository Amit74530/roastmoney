import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import BrandLogo from '../components/BrandLogo'

export default function ResetPassword({ authReady, isAuthenticated }) {
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  // Supabase exchanges recovery links for a session before App marks auth ready.
  // Query-string presence alone is not evidence of a valid recovery session.

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.password || !form.confirmPassword) {
      setError('Complete both password fields.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (!supabase) {
      setError('Supabase is not available. Check the configuration and reload the page.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      })

      if (updateError) throw updateError

      setSuccess('Password updated. Your account is ready.')
    } catch (authError) {
      const message = authError?.message || ''
      if (message.includes('over_email_send_rate_limit') || message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment before trying again.')
      } else if (message.includes('token') || message.includes('expired') || message.includes('invalid')) {
        setError('This reset link has expired. Please request a new one.')
      } else {
        setError('Could not update password. Please try again.')
      }
      console.error('[ResetPassword]', authError)
    } finally {
      setLoading(false)
    }
  }

  if (!authReady) return <main className="auth-loading" role="status">Verifying your reset link…</main>

  if (!isAuthenticated) {
    return (
      <main className="auth">
        <section className="auth-brand">
          <Link to="/login" className="brand">
            <BrandLogo size="lg" />
          </Link>
          <div className="auth-hero">
            <p className="auth-status"><i /> Financial intelligence online</p>
            <p className="eyebrow">Personal finance, with attitude.</p>
            <h1>Invalid<br /><em>reset link.</em></h1>
            <div className="auth-pulse" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
            <p className="auth-quote">This link has expired or is invalid.</p>
          </div>
          <span className="auth-stamp">Est. 2026 / financial intelligence</span>
        </section>
        <section className="auth-form">
          <div className="auth-form-inner">
            <p className="eyebrow">Identity check</p>
            <h2>We couldn't verify this link.</h2>
            <p className="lead">{error || 'Please request a new password reset email.'}</p>
            <p className="auth-switch">
              <Link to="/forgot-password" className="button lime">Request new link <ArrowRight size={16} /></Link>
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="auth">
      <section className="auth-brand">
        <Link to="/login" className="brand">
          <BrandLogo size="lg" />
        </Link>
        <div className="auth-hero">
          <p className="auth-status"><i /> Financial intelligence online</p>
          <p className="eyebrow">Personal finance, with attitude.</p>
          <h1>Set a new<br /><em>password.</em></h1>
          <div className="auth-pulse" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <p className="auth-quote">Make it memorable. Or don't — we'll roast you either way.</p>
        </div>
        <span className="auth-stamp">Est. 2026 / financial intelligence</span>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <p className="eyebrow">New credentials</p>
          <h2>Enter your new password.</h2>
          <p className="lead">Your money is waiting for its new keeper.</p>
          {success ? <div role="status"><p className="success">{success}</p><p className="auth-switch"><Link to="/dashboard" className="button lime">Continue to dashboard <ArrowRight size={16} /></Link></p></div> : <form onSubmit={handleSubmit}>
            <label>
              <Lock size={16} style={{ display: 'none' }} />
              New password
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            <label>
              <Lock size={16} style={{ display: 'none' }} />
              Confirm password
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button lime" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
              <ArrowRight size={16} />
            </button>
          </form>}
          <p className="auth-switch">
            <Link to="/login">Back to sign in.</Link>
          </p>
        </div>
      </section>
    </main>
  )
}