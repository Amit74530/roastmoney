import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Component } from 'react'
import { Activity, ArrowRight, BarChart3, CircleDollarSign, Home, LogOut, Menu, Moon, Plus, Settings as SettingsIcon, Sparkles, SunMedium, Trophy, UserRound, Wallet, X } from 'lucide-react'
import { demoData } from './data/demoData'
import { supabase } from './lib/supabaseClient'
import { fetchUserTransactions, createUserTransaction, updateUserTransaction, deleteUserTransaction } from './lib/transactionService'
import { generateExpenseRoast } from './lib/engines/insights'
import { fetchUserBudgets } from './lib/budgetService'
import { clearUser, getPreferences, getUser, savePreferences, saveUser, subscribePreferences } from './utils/storage'
import { TransactionCapture, isNativeCaptureAvailable } from './plugins/transactionCapture'
import { processCapturedNotification } from './lib/captureService'
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const AnalyticsPage = lazy(() => import('./pages/Analytics'))
const PersonalityPage = lazy(() => import('./pages/Personality'))
const AchievementsPage = lazy(() => import('./pages/Achievements'))
const WrappedPage = lazy(() => import('./pages/Wrapped'))
const RoastScanPage = lazy(() => import('./pages/RoastScan'))
const BudgetsPage = lazy(() => import('./pages/Budgets'))
import TransactionManager from './components/TransactionManager'
import RoastScanShareGate from './components/RoastScanShareGate'
import ForgotPasswordPage from './pages/ForgotPassword'
import ResetPasswordPage from './pages/ResetPassword'
import BrandLogo from './components/BrandLogo'
import Toaster from './components/Toaster'
import useToast from './hooks/useToast'
import './App.css'
import './ui-polish.css'

const sidebarItems = [
  ['/dashboard', 'Home', Home],
  ['/transactions', 'Activity', Activity],
  ['/analytics', 'Insights', BarChart3],
  ['/budgets', 'Budgets', Wallet],
  ['/personality', 'Roast', Sparkles],
  ['/achievements', 'Achievements', Trophy],
  ['/wrapped', 'Wrapped', CircleDollarSign],
]

const pageTitles = {
  '/dashboard': 'Home',
  '/transactions': 'Activity',
  '/analytics': 'Insights',
  '/budgets': 'Budgets',
  '/personality': 'Roast',
  '/achievements': 'Achievements',
  '/wrapped': 'Wrapped',
  '/settings': 'Settings',
  '/roastscan': 'RoastScan',
}

const getInitials = (name, fallback = 'AM') => {
  const source = (name || fallback).trim()
  if (!source) return fallback.slice(0, 2).toUpperCase()
  return source.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

const buildUserFromSupabase = (user) => ({
  id: user?.id || null,
  name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'RoastMoney User',
  email: user?.email || '',
  initials: getInitials(user?.user_metadata?.name || user?.email?.split('@')[0], 'RM'),
})

function Auth({ mode }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.email.trim() || !form.password || (mode === 'signup' && !form.name.trim())) {
      setError('Complete the form. Your financial honesty starts here.')
      setSuccess('')
      return
    }

    const email = form.email.trim()
    const password = form.password
    const name = form.name.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      setSuccess('')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      setSuccess('')
      return
    }

    if (!supabase) {
      setError('Supabase is not available. Check the configuration and reload the page.')
      console.error('[Auth] Supabase client unavailable.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'signup') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })

        if (signupError) throw signupError

        if (data?.user) {
          const profilePayload = {
            id: data.user.id,
            name,
            email,
            created_at: new Date().toISOString(),
          }
          const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
          if (profileError) console.error('[Auth] Profile creation failed:', profileError)
          saveUser(buildUserFromSupabase(data.user))

          // Handle email confirmation flow - if no session, show success message instead of navigating
          if (data.session) {
            setSuccess('Account created. Redirecting to your dashboard…')
            navigate('/dashboard')
          } else {
            setSuccess('Account created! Please check your email to confirm your account. After confirmation, sign in to continue.')
          }
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        if (data?.user) {
          saveUser(buildUserFromSupabase(data.user))
          setSuccess('Welcome back. Redirecting…')
          navigate('/dashboard')
        }
      }
    } catch (authError) {
      const message = authError?.message || ''
      if (message.includes('over_email_send_rate_limit') || message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment before trying again.')
      } else {
        setError(authError?.message || 'Authentication failed. Please try again.')
      }
      console.error('[Auth]', authError)
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
          <h1>Your money<br /><em>has opinions.</em></h1>
          <div className="auth-pulse" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <p className="auth-quote">A financial intelligence system for people who prefer brutal honesty to budgeting spreadsheets.</p>
        </div>
        <span className="auth-stamp">Est. 2026 / financial intelligence</span>
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <p className="eyebrow">{mode === 'login' ? 'Identity check' : 'New subject'}</p>
          <h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
          <p className="lead">{mode === 'login' ? 'Your money has been making decisions without supervision.' : 'This is where the financial honesty begins.'}</p>
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>Name
                <input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amit Karki" />
              </label>
            )}
            <label>Email
              <input required autoComplete="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </label>
            <label>Password
              <input required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </label>
            {mode === 'login' && (
              <p className="auth-switch" style={{ marginTop: '-8px', marginBottom: '8px' }}>
                <Link to="/forgot-password" style={{ fontSize: '13px' }}>Forgot password?</Link>
              </p>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            {success && <p className="success" role="status">{success}</p>}
            <button className="button lime" disabled={loading}>
              {loading ? 'Working…' : (mode === 'login' ? 'Enter the damage' : 'Start the diagnosis')}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already under observation?'}{' '}
            <Link to={mode === 'login' ? '/signup' : '/login'}>{mode === 'login' ? 'Get roasted.' : 'Sign in.'}</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

function Shell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser() || demoData.user
  const [drawer, setDrawer] = useState(false)
  const drawerRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!drawer) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector('a, button')?.focus()
    const handleKey = (event) => {
      if (event.key === 'Escape') setDrawer(false)
      if (event.key !== 'Tab') return
      const items = [...drawerRef.current.querySelectorAll('a, button')].filter((item) => item.getClientRects().length)
      const first = items[0]
      const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const handleResize = () => { if (window.innerWidth > 800) setDrawer(false) }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [drawer])
  const [addNotice, setAddNotice] = useState(false)
  const [showAddHint, setShowAddHint] = useState(false)
  const [theme, setTheme] = useState(() => getPreferences().theme || 'system')
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const pref = getPreferences().theme || 'system'
    if (pref === 'system') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return pref
  })
  const title = pageTitles[location.pathname] || 'Home'
  const adding = location.pathname === '/transactions' && new URLSearchParams(location.search).get('add') === '1'

  useEffect(() => {
    const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme
    setResolvedTheme(resolved)
    document.documentElement.dataset.theme = resolved
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return undefined
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e) => {
      const newResolved = e.matches ? 'light' : 'dark'
      setResolvedTheme(newResolved)
      document.documentElement.dataset.theme = newResolved
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => subscribePreferences(() => {
    setTheme(getPreferences().theme || 'system')
  }), [])

  useEffect(() => {
  if (sessionStorage.getItem('roastmoney-add-hint-seen')) return undefined
  const showTimer = window.setTimeout(() => setShowAddHint(true), 4500)
  const hideTimer = window.setTimeout(() => {
    setShowAddHint(false)
    sessionStorage.setItem('roastmoney-add-hint-seen', 'true')
  }, 10500)
  return () => {
    window.clearTimeout(showTimer)
    window.clearTimeout(hideTimer)
  }
}, [])

  useEffect(() => {
    if (!addNotice) return undefined
    const noticeTimer = window.setTimeout(() => setAddNotice(false), 2200)
    return () => window.clearTimeout(noticeTimer)
  }, [addNotice])

  const handleAddTap = () => {
    sessionStorage.setItem('roastmoney-add-hint-seen', 'true')
    setShowAddHint(false)
    setAddNotice(true)
    navigate('/transactions?add=1')
  }

  const handleSignOut = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      clearUser()
      navigate('/login')
    } catch (error) {
      console.error('[Auth] Sign out failed:', error)
      toast.error('Could not sign out. Please try again.')
    }
  }

  const cycleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark'
      savePreferences({ ...getPreferences(), theme: next })
      return next
    })
  }

  const themeIcon = resolvedTheme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={`sidebar-backdrop ${drawer ? 'open' : ''}`} aria-hidden="true" onClick={() => setDrawer(false)} />
      <aside ref={drawerRef} id="sidebar-navigation" className={drawer ? 'sidebar open' : 'sidebar'}>
        <div className="side-top">
          <Link to="/dashboard" className="brand" onClick={() => setDrawer(false)}>
            <BrandLogo />
          </Link>
          <button className="icon-button close-drawer" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={18} /></button>
        </div>
        <nav aria-label="Primary navigation">
          {sidebarItems.map(([path, label, Icon]) => (
            <NavLink onClick={() => setDrawer(false)} className="nav-link" to={path} key={path}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <NavLink className="nav-link" to="/settings" onClick={() => setDrawer(false)}><SettingsIcon size={17} />Settings</NavLink>
          <div className="profile">
            <div className="avatar">{user.initials}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email || 'Free plan'}</small>
            </div>
            <button className="icon-button" title="Log out" aria-label="Log out" onClick={handleSignOut}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <div className="main" inert={drawer}>
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" aria-expanded={drawer} aria-controls="sidebar-navigation" onClick={() => setDrawer(true)}><Menu size={20} /></button>
          <Link to="/dashboard" className="brand topbar-brand" aria-label="Home">
            <BrandLogo compact size="sm" />
          </Link>
          <div className="topbar-title">
            <h3>{title}</h3>
          </div>
          <div className="top-actions">
            <span className="date">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <button className="icon-button theme-toggle" aria-label="Toggle theme" onClick={cycleTheme}>{themeIcon}</button>
            <div className="avatar" aria-label={`Signed in as ${user.name}`}>{user.initials}</div>
          </div>
        </header>
        <main className="page" id="main-content" tabIndex={-1}><Suspense fallback={<section className="card ledger-status" role="status">Loading your page…</section>}>{children}</Suspense></main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation" inert={drawer}>
        <NavLink className="bottom-nav-link" to="/dashboard"><Home size={16} />Home</NavLink>
        <NavLink className={({ isActive }) => `bottom-nav-link${isActive && !adding ? ' active' : ''}`} to="/transactions"><Activity size={16} />Activity</NavLink>
        <Link className="add-nav-action" to="/transactions?add=1" onClick={handleAddTap} aria-label="Add transaction"><Plus size={20} /></Link>
        <NavLink className="bottom-nav-link" to="/analytics"><BarChart3 size={16} />Insights</NavLink>
        <NavLink className="bottom-nav-link" to="/personality"><Sparkles size={16} />Roast</NavLink>
        {showAddHint && <span className="add-nav-hint" role="status">Add your next move <ArrowRight size={13} /></span>}
      </nav>
      {addNotice && <div className="add-welcome" role="status">Ready to make a money move?</div>}
    </div>
  )
}

function Settings() {
  const user = getUser() || demoData.user
  const [intensity, setIntensity] = useState(getPreferences().intensity)
  const [theme, setTheme] = useState(getPreferences().theme || 'system')
  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'

  useEffect(() => subscribePreferences(() => {
    const prefs = getPreferences()
    setIntensity(prefs.intensity)
    setTheme(prefs.theme || 'system')
  }), [])

  return (
    <>
      <div className="page-intro compact-intro">
        <div>
          <p className="eyebrow">Control room</p>
          <h1>Make yourself at home.</h1>
          <p className="lead">Profile, roast intensity, and appearance.</p>
        </div>
      </div>
      <section className="card settings-card">
        <div className="setting">
          <div>
            <span className="eyebrow">Profile</span>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <UserRound size={20} />
        </div>
        <div className="setting">
          <div>
            <span className="eyebrow">Roast preferences</span>
            <h2>How honest should we be?</h2>
            <p>Your wallet has requested a gentler approach.</p>
          </div>
          <div className="segmented preference">
            {['MILD', 'SAVAGE', 'BRUTAL'].map((item) => (
              <button className={intensity === item ? 'active' : ''} onClick={() => { setIntensity(item); savePreferences({ ...getPreferences(), intensity: item }) }} key={item}>{item}</button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <span className="eyebrow">Appearance</span>
            <h2>{themeLabel} theme</h2>
            <p>Matches the control in the top bar. System follows the device.</p>
          </div>
          <div className="segmented preference">
            {['dark', 'light', 'system'].map((item) => (
              <button className={theme === item ? 'active' : ''} onClick={() => { setTheme(item); savePreferences({ ...getPreferences(), theme: item }) }} key={item}>{item}</button>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function Protected({ children, isAuthenticated, authReady }) {
  if (!authReady) {
    return (
      <main className="auth-loading" role="status">
        <p className="eyebrow">Loading</p>
        <h1>Loading your ledger…</h1>
      </main>
    )
  }
  return isAuthenticated ? <Shell>{children}</Shell> : <Navigate to="/login" replace />
}

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('[App] Protected route failed:', error)
  }

  render() {
    if (this.state.hasError) {
      return <main className="page"><p className="error">Something went wrong. Please refresh and try again.</p></main>
    }
    return this.props.children
  }
}

function App() {
  const navigate = useNavigate()
  const { toastState } = useToast()
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState('')
  const [budgets, setBudgets] = useState([])
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!session?.user) {
      setBudgets([])
      return undefined
    }
    let active = true
    fetchUserBudgets(session.user.id)
      .then((rows) => {
        if (active) setBudgets(rows)
      })
      .catch((error) => {
        console.error('[App] Failed to fetch budgets:', error)
        if (active) setBudgets([])
      })
    return () => {
      active = false
    }
  }, [session])

useEffect(() => {
  // Only run on native Android and when we have a logged-in user
  if (!isNativeCaptureAvailable() || !session?.user) return

  let listenerHandle = null

  const setupListener = async () => {
    try {
      // Request permission (opens settings if needed)
      const perm = await TransactionCapture.isEnabled()
      if (!perm.enabled) {
        // You could show a prompt here to ask the user to open settings
        console.log('[App] Notification listener permission not granted.')
        return
      }

      // Add the listener
      listenerHandle = await TransactionCapture.addListener('notificationCaptured', (event) => {
        console.log('[App] Received captured notification:', event)
        // Process the notification and save it to Supabase
        processCapturedNotification(event, session.user.id)
      })
      console.log('[App] Transaction capture listener registered.')

    } catch (error) {
      console.error('[App] Failed to set up transaction capture listener:', error)
    }
  }

  setupListener()

  // Cleanup listener when the component unmounts or session changes
  return () => {
    if (listenerHandle) {
      listenerHandle.remove()
      console.log('[App] Transaction capture listener removed.')
    }
  }
}, [session])

  useEffect(() => {
    if (!session?.user) {
      setTransactions([])
      setTransactionsLoading(false)
      return
    }

    let active = true

    const loadUserTransactions = async () => {
      setTransactionsLoading(true)
      setTransactionsError('')
      try {
        const rows = await fetchUserTransactions(session.user.id)
        if (active) setTransactions(rows)
      } catch (error) {
        console.error('[App] Failed to fetch user transactions:', error)
        if (active) {
          setTransactions([])
          setTransactionsError('We could not load your transactions. Please try again.')
        }
      } finally {
        if (active) setTransactionsLoading(false)
      }
    }

    loadUserTransactions()
    return () => { active = false }
  }, [session])

  useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      if (!supabase) {
        setAuthReady(true)
        return
      }

      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        if (!isMounted) return
        if (error) throw error
        setSession(currentSession)
        if (currentSession?.user) saveUser(buildUserFromSupabase(currentSession.user))
        else clearUser()
      } catch (error) {
        console.error('[Auth] Session check failed:', error)
        if (isMounted) { setSession(null); clearUser() }
      } finally {
        if (isMounted) setAuthReady(true)
      }
    }

    syncSession()

    const { data: { subscription } } = supabase
      ? supabase.auth.onAuthStateChange((event, nextSession) => {
          if (!isMounted) return
          setSession(nextSession)
          setAuthReady(true)
          if (nextSession?.user) saveUser(buildUserFromSupabase(nextSession.user))
          else clearUser()
          if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true })
        })
      : { data: { subscription: null } }

    return () => {
      isMounted = false
      if (subscription) subscription.unsubscribe()
    }
  }, [navigate])

  const handleAddTransaction = async (payload) => {
    if (!session?.user) {
      throw new Error('You must be signed in to save this transaction.')
    }
    try {
      const created = await createUserTransaction(session.user.id, payload)
      const createdRow = created?.[0]
      if (!createdRow) {
        throw new Error('The transaction was saved but no row was returned. Refresh to see your ledger.')
      }
      const subject = { ...createdRow, time: payload.time || createdRow.time }
      const roast = subject.type === 'expense'
        ? generateExpenseRoast(subject, transactions, getPreferences().intensity)
        : null
      setTransactions((current) => [...created, ...current])
      return { created, roast }
    } catch (error) {
      console.error('[App] createUserTransaction failed:', error)
      throw error
    }
  }

  const handleDeleteTransaction = async (transactionId) => {
    if (!session?.user) return
    try {
      await deleteUserTransaction(session.user.id, transactionId)
      setTransactions((current) => current.filter((item) => item.id !== transactionId))
    } catch (error) {
      console.error('[App] deleteUserTransaction failed:', error)
      throw error
    }
  }

  const handleUpdateTransaction = async (transactionId, payload) => {
    if (!session?.user) {
      throw new Error('You must be signed in to update a transaction.')
    }
    try {
      const updated = await updateUserTransaction(session.user.id, transactionId, payload)
      const updatedRow = updated?.[0]
      if (!updatedRow) {
        throw new Error('The update returned no row. The transaction may have been removed.')
      }
      setTransactions((current) =>
        current.map((item) => (item.id === transactionId ? updatedRow : item)),
      )
      return updated
    } catch (error) {
      console.error('[App] updateUserTransaction failed:', error)
      throw error
    }
  }

  return (
    <>
      <RoastScanShareGate isAuthenticated={Boolean(session)} />
      <Toaster toast={toastState} />
      <Routes>
        <Route path="/login" element={authReady && session ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />} />
        <Route path="/signup" element={authReady && session ? <Navigate to="/dashboard" replace /> : <Auth mode="signup" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage authReady={authReady} isAuthenticated={Boolean(session)} />} />
        <Route path="*" element={
          <Protected isAuthenticated={Boolean(session)} authReady={authReady}>
            <Routes>
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage transactions={transactions} budgets={budgets} onAdd={handleAddTransaction} loading={transactionsLoading} error={transactionsError} /></ErrorBoundary>} />
              <Route path="/transactions" element={<ErrorBoundary><TransactionManager transactions={transactions} setTransactions={setTransactions} loading={transactionsLoading} fetchError={transactionsError} onCreateTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} /></ErrorBoundary>} />
              <Route path="/analytics" element={<ErrorBoundary><AnalyticsPage transactions={transactions} /></ErrorBoundary>} />
              <Route path="/personality" element={<ErrorBoundary><PersonalityPage transactions={transactions} /></ErrorBoundary>} />
              <Route path="/achievements" element={<ErrorBoundary><AchievementsPage transactions={transactions} /></ErrorBoundary>} />
              <Route path="/wrapped" element={<ErrorBoundary><WrappedPage transactions={transactions} /></ErrorBoundary>} />
              <Route path="/roastscan" element={<ErrorBoundary><RoastScanPage transactions={transactions} onSave={handleAddTransaction} /></ErrorBoundary>} />
              <Route path="/budgets" element={
                <ErrorBoundary>
                  <BudgetsPage
                    userId={session?.user?.id}
                    transactions={transactions}
                    onBudgetsChanged={setBudgets}
                  />
                </ErrorBoundary>
              } />
              <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="*" element={<ErrorBoundary><Navigate to="/dashboard" replace /></ErrorBoundary>} />
            </Routes>
          </Protected>
        } />
      </Routes>
    </>
  )
}

export default App
