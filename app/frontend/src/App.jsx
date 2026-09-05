import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, BarChart3, Bell, CircleDollarSign, Home, LogOut, Menu, Moon, Plus, Settings as SettingsIcon, Sparkles, SunMedium, Trophy, UserRound, X } from 'lucide-react'
import { demoData } from './data/demoData'
import { supabase } from './lib/supabaseClient'
import { fetchUserTransactions, createUserTransaction, updateUserTransaction, deleteUserTransaction } from './lib/transactionService'
import { generateExpenseRoast } from './lib/engines/insights'
import { clearUser, getPreferences, getUser, savePreferences, saveUser, subscribePreferences } from './utils/storage'
import DashboardPage from './pages/Dashboard'
import AnalyticsPage from './pages/Analytics'
import PersonalityPage from './pages/Personality'
import AchievementsPage from './pages/Achievements'
import WrappedPage from './pages/Wrapped'
import RoastScanPage from './pages/RoastScan'
import TransactionManager from './components/TransactionManager'
import RoastScanShareGate from './components/RoastScanShareGate'
import BrandLogo from './components/BrandLogo'
import './App.css'
import './ui-polish.css'

const sidebarItems = [
  ['/dashboard', 'Home', Home],
  ['/transactions', 'Activity', Activity],
  ['/analytics', 'Insights', BarChart3],
  ['/personality', 'Roast', Sparkles],
  ['/achievements', 'Achievements', Trophy],
  ['/wrapped', 'Wrapped', CircleDollarSign],
]

const pageTitles = {
  '/dashboard': 'Home',
  '/transactions': 'Activity',
  '/analytics': 'Insights',
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

    if (!form.email || !form.password || (mode === 'signup' && !form.name)) {
      setError('Complete the form. Your financial honesty starts here.')
      setSuccess('')
      return
    }

    const email = form.email.trim()
    const password = form.password.trim()
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
          setSuccess('Account created. Redirecting to your dashboard…')
          navigate('/dashboard')
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
      setError(authError?.message || 'Authentication failed. Please try again.')
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
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amit Karki" />
              </label>
            )}
            <label>Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            </label>
            <label>Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </label>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
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
  const [addNotice, setAddNotice] = useState(false)
  const [showAddHint, setShowAddHint] = useState(false)
  const [theme, setTheme] = useState(() => getPreferences().theme || 'system')
  const title = pageTitles[location.pathname] || 'ROAST.MONEY'
  const adding = location.pathname === '/transactions' && new URLSearchParams(location.search).get('add') === '1'

  useEffect(() => {
    const resolvedTheme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme
    document.documentElement.dataset.theme = resolvedTheme
  }, [theme])

  useEffect(() => subscribePreferences(() => {
    setTheme(getPreferences().theme || 'system')
  }), [])

  useEffect(() => {
    if (sessionStorage.getItem('roastmoney-add-hint-seen')) return undefined
    const hintTimer = window.setTimeout(() => setShowAddHint(true), 4500)
    return () => window.clearTimeout(hintTimer)
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
        if (error) console.error('[Auth] Sign out failed:', error)
      }
    } catch (error) {
      console.error('[Auth] Sign out failed:', error)
    } finally {
      clearUser()
      navigate('/login')
    }
  }

  const cycleTheme = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark'
      savePreferences({ ...getPreferences(), theme: next })
      return next
    })
  }

  const themeIcon = theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />

  return (
    <div className="shell">
      <div className={`sidebar-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />
      <aside className={drawer ? 'sidebar open' : 'sidebar'}>
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
      <div className="main">
        <header className="topbar">
          <button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu size={20} /></button>
          <Link to="/dashboard" className="brand topbar-brand" aria-label="ROAST.MONEY home"><BrandLogo compact size="sm" /></Link>
          <div className="topbar-title">
            <h3>{title}</h3>
          </div>
          <div className="top-actions">
            <span className="date">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <button className="icon-button theme-toggle" aria-label="Toggle theme" onClick={cycleTheme}>{themeIcon}</button>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <div className="avatar" aria-label={`Signed in as ${user.name}`}>{user.initials}</div>
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
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
          <h1>Settings</h1>
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
        <p className="eyebrow">ROAST.MONEY</p>
        <h1>Loading your ledger…</h1>
      </main>
    )
  }
  return isAuthenticated ? <Shell>{children}</Shell> : <Navigate to="/login" replace />
}

function App() {
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsError, setTransactionsError] = useState('')
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

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

      const { data: { session: currentSession }, error } = await supabase.auth.getSession()
      if (!isMounted) return

      if (error) console.error('[Auth] Session check failed:', error)

      setSession(currentSession)
      if (currentSession?.user) saveUser(buildUserFromSupabase(currentSession.user))
      else clearUser()
      setAuthReady(true)
    }

    syncSession()

    const { data: { subscription } } = supabase
      ? supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession)
          if (nextSession?.user) saveUser(buildUserFromSupabase(nextSession.user))
          else clearUser()
        })
      : { data: { subscription: null } }

    return () => {
      isMounted = false
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  const handleAddTransaction = async (payload) => {
    if (!session?.user) return
    try {
      const created = await createUserTransaction(session.user.id, payload)
      const subject = { ...created[0], time: payload.time || created[0].time }
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
    if (!session?.user) return
    try {
      const updated = await updateUserTransaction(session.user.id, transactionId, payload)
      setTransactions((current) => current.map((item) => item.id === transactionId ? updated[0] : item))
      return updated
    } catch (error) {
      console.error('[App] updateUserTransaction failed:', error)
      throw error
    }
  }

  return (
    <BrowserRouter>
      <RoastScanShareGate isAuthenticated={Boolean(session)} />
      <Routes>
        <Route path="/login" element={authReady && session ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />} />
        <Route path="/signup" element={authReady && session ? <Navigate to="/dashboard" replace /> : <Auth mode="signup" />} />
        <Route path="*" element={
          <Protected isAuthenticated={Boolean(session)} authReady={authReady}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage transactions={transactions} onAdd={handleAddTransaction} />} />
              <Route path="/transactions" element={<TransactionManager transactions={transactions} setTransactions={setTransactions} loading={transactionsLoading} fetchError={transactionsError} onCreateTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />} />
              <Route path="/analytics" element={<AnalyticsPage transactions={transactions} />} />
              <Route path="/personality" element={<PersonalityPage transactions={transactions} />} />
              <Route path="/achievements" element={<AchievementsPage transactions={transactions} />} />
              <Route path="/wrapped" element={<WrappedPage transactions={transactions} />} />
              <Route path="/roastscan" element={<RoastScanPage transactions={transactions} onSave={handleAddTransaction} />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Protected>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
