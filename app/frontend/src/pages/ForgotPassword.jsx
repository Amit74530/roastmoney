import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import BrandLogo from '../components/BrandLogo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (!supabase) {
      setError('Supabase is not available. Check the configuration and reload the page.')
      return
    }

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      setSuccess('If an account exists, a password reset link has been sent. Check your inbox (and spam).')
    } catch (authError) {
      const message = authError?.message || ''
      if (message.includes('over_email_send_rate_limit') || message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment before trying again.')
      } else {
        setError('Could not send reset email. Please try again later.')
      }
      console.error('[ForgotPassword]', authError)
    } finally {
      setLoading(false)
    }
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
          <h1>Forgot your<br /><em>password?</em></h1>
          <div className="auth-pulse" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <p className="auth-quote">Even the most disciplined minds need a reset sometimes.</p>
        </div>
        <span className="auth-stamp">Est. 2026 / financial intelligence</span>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <p className="eyebrow">Identity check</p>
          <h2>Reset your password.</h2>
          <p className="lead">Enter your email and we'll send a secure link to set a new password.</p>
          <form onSubmit={handleSubmit}>
            <label>
              <Mail size={16} style={{ display: 'none' }} />
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
            <button className="button lime" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="auth-switch">
            Remember your credentials?{' '}
            <Link to="/login">Sign in.</Link>
          </p>
        </div>
      </section>
    </main>
  )
}