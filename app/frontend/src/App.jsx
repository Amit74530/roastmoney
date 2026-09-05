import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, BarChart3, Bell, Bolt, Check, ChevronLeft, ChevronRight, CircleDollarSign, Home, Lock, LogOut, Menu, Moon, Pencil, Plus, Search, Settings as SettingsIcon, Sparkles, SunMedium, Trash2, Trophy, UserRound, X } from 'lucide-react'
import { categories, demoData } from './data/demoData'
import { supabase } from './lib/supabaseClient'
import { fetchUserTransactions, createUserTransaction, updateUserTransaction, deleteUserTransaction } from './lib/transactionService'
import { clearUser, getPreferences, getTransactions, getUser, savePreferences, saveTransactions, saveUser } from './utils/storage'
import DashboardPage from './pages/Dashboard'
import AnalyticsPage from './pages/Analytics'
import PersonalityPage from './pages/Personality'
import AchievementsPage from './pages/Achievements'
import WrappedPage from './pages/Wrapped'
import TransactionManager from './components/TransactionManager'
import './App.css'
import './ui-polish.css'

const money = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`
const navItems = [['/dashboard', 'OVERVIEW', Home], ['/transactions', 'TRANSACTIONS', Activity], ['/analytics', 'ANALYTICS', BarChart3], ['/personality', 'PERSONALITY', Sparkles], ['/achievements', 'ACHIEVEMENTS', Trophy], ['/wrapped', 'WRAPPED', CircleDollarSign]]
const iconFor = (category) => ({ Food: 'FO', Shopping: 'SH', Transport: 'TR', Subscriptions: 'SU', Entertainment: 'EN', Bills: 'BI', Other: 'OT' })[category] || 'OT'

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
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email || !form.password || (mode === 'signup' && !form.name)) {
      setError('Complete the form. Your financial honesty starts here.');
      setSuccess('');
      return;
    }

    const email = form.email.trim();
    const password = form.password.trim();
    const name = form.name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      setSuccess('');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setSuccess('');
      return;
    }

    if (!supabase) {
      setError('Supabase is not available. Check the configuration and reload the page.');
      console.error('[Auth] Supabase client unavailable.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (signupError) {
          throw signupError;
        }

        if (data?.user) {
          const profilePayload = {
            id: data.user.id,
            name,
            email,
            created_at: new Date().toISOString(),
          };

          const { error: profileError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
          if (profileError) {
            console.error('[Auth] Profile creation failed:', profileError);
          }

          saveUser(buildUserFromSupabase(data.user));
          setSuccess('Account created. Redirecting to your dashboard…');
          navigate('/dashboard');
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

        if (loginError) {
          throw loginError;
        }

        if (data?.user) {
          saveUser(buildUserFromSupabase(data.user));
          setSuccess('Welcome back. Redirecting…');
          navigate('/dashboard');
        }
      }
    } catch (authError) {
      const message = authError?.message || 'Authentication failed. Please try again.';
      setError(message);
      console.error('[Auth]', authError);
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth"><section className="auth-brand"><Link to="/login" className="brand">ROAST<span>.</span>MONEY</Link><div className="auth-hero"><p className="auth-status"><i /> FINANCIAL INTELLIGENCE ONLINE</p><p className="eyebrow">PERSONAL FINANCE, WITH ATTITUDE.</p><h1>YOUR MONEY<br /><em>HAS OPINIONS.</em></h1><div className="auth-pulse" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div><p className="auth-quote">A financial intelligence system for people who prefer brutal honesty to budgeting spreadsheets.</p></div><span className="auth-stamp">EST. 2026 / FINANCIAL INTELLIGENCE</span></section><section className="auth-form"><div className="auth-form-inner"><p className="eyebrow">{mode === 'login' ? 'IDENTITY CHECK' : 'NEW SUBJECT'}</p><h2>{mode === 'login' ? 'WELCOME BACK.' : 'CREATE YOUR ACCOUNT.'}</h2><p className="lead">{mode === 'login' ? 'Your money has been making decisions without supervision.' : 'This is where the financial honesty begins.'}</p><form onSubmit={handleSubmit}>{mode === 'signup' && <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Amit Karki" /></label>}<label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>{error && <p className="error">{error}</p>}{success && <p className="success">{success}</p>}<button className="button lime" disabled={loading}>{loading ? 'WORKING…' : (mode === 'login' ? 'ENTER THE DAMAGE' : 'START THE DIAGNOSIS')} <ArrowRight size={16} /></button></form><p className="auth-switch">{mode === 'login' ? "Don't have an account?" : 'Already under observation?'} <Link to={mode === 'login' ? '/signup' : '/login'}>{mode === 'login' ? 'Get roasted.' : 'Sign in.'}</Link></p></div></section></main>
}

function Shell({ children }) {
  const navigate = useNavigate(); const location = useLocation(); const user = getUser() || demoData.user; const [drawer, setDrawer] = useState(false)
  const [addNotice, setAddNotice] = useState(false); const [showAddHint, setShowAddHint] = useState(false)
  const [theme, setTheme] = useState(() => getPreferences().theme || 'system')
  const title = navItems.find(([path]) => location.pathname === path)?.[1] || (location.pathname === '/settings' ? 'SETTINGS' : 'OVERVIEW')

  useEffect(() => {
    const resolvedTheme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme
    document.documentElement.dataset.theme = resolvedTheme
    savePreferences({ ...getPreferences(), theme })
  }, [theme])

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
  }

  const handleSignOut = async () => {
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[Auth] Sign out failed:', error);
        }
      }
    } catch (error) {
      console.error('[Auth] Sign out failed:', error);
    } finally {
      clearUser();
      navigate('/login');
    }
  }

  const cycleTheme = () => {
    setTheme((current) => current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark')
  }

  const themeIcon = theme === 'dark' ? <SunMedium size={18} /> : <Moon size={18} />

  return <div className="shell"><div className={`sidebar-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} /><aside className={drawer ? 'sidebar open' : 'sidebar'}><div className="side-top"><Link to="/dashboard" className="brand">ROAST<span>.</span>MONEY</Link><button className="icon-button close-drawer" aria-label="Close navigation" onClick={() => setDrawer(false)}><X size={18} /></button></div><nav aria-label="Primary navigation">{navItems.map(([path, label, Icon]) => <NavLink onClick={() => setDrawer(false)} className="nav-link" to={path} key={path}><Icon size={17} />{label}</NavLink>)}</nav><div className="side-bottom"><NavLink className="nav-link" to="/settings"><SettingsIcon size={17} />SETTINGS</NavLink><div className="profile"><div className="avatar">{user.initials}</div><div><strong>{user.name}</strong><small>{user.email || 'FREE PLAN'}</small></div><button className="icon-button" title="Log out" aria-label="Log out" onClick={handleSignOut}><LogOut size={16} /></button></div></div></aside><div className="main"><header className="topbar"><button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setDrawer(true)}><Menu size={20} /></button><div><span className="crumb">ROAST.MONEY / {title}</span><h3>{title}</h3></div><div className="top-actions"><span className="date">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span><button className="icon-button theme-toggle" aria-label="Toggle theme" onClick={cycleTheme}>{themeIcon}</button><button className="icon-button" aria-label="Notifications"><Bell size={18} /></button><div className="avatar" aria-label={`Signed in as ${user.name}`}>{user.initials}</div></div></header><div className="page">{children}</div></div><nav className="mobile-bottom-nav" aria-label="Mobile navigation">{navItems.slice(0,5).map(([path, label, Icon]) => <NavLink className="bottom-nav-link" to={path} key={path}><Icon size={16} />{label === 'OVERVIEW' ? 'Home' : label === 'TRANSACTIONS' ? 'Tx' : label === 'ANALYTICS' ? 'Stats' : label === 'ACHIEVEMENTS' ? 'Wins' : 'Wrap'}</NavLink>)}<NavLink className="bottom-nav-link add-nav-action" to="/transactions" onClick={handleAddTap} aria-label="Add transaction"><Plus size={16} />Add</NavLink>{showAddHint && <span className="add-nav-hint" role="status">ADD YOUR NEXT MOVE <ArrowRight size={13} /></span>}</nav>{addNotice && <div className="add-welcome" role="status">READY TO MAKE A MONEY MOVE?</div>}</div>
}

function Card({ children, className = '' }) { return <section className={`card ${className}`}>{children}</section> }
function Metric({ label, value, foot, accent = '' }) { return <Card className="metric"><span className="metric-label">{label}</span><strong className={accent}>{value}</strong><small>{foot}</small></Card> }
function Chart({ compact = false }) { const bars = [42, 58, 35, 71, 49, 84, 63, 92, 55, 68, 44, 76]; return <div className={compact ? 'chart compact' : 'chart'}><div className="chart-y"><span>₹8k</span><span>₹4k</span><span>₹0</span></div><div className="bars">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }}><b /></i>)}</div><div className="chart-x"><span>01 AUG</span><span>15 AUG</span><span>31 AUG</span></div></div> }
function Dashboard({ transactions }) { const total = transactions.reduce((sum, item) => sum + item.amount, 0); return <><div className="page-intro"><div><p className="eyebrow">WEDNESDAY, 02 SEPTEMBER 2026</p><h1>GOOD EVENING, AMIT.</h1><p className="headline">Your wallet is feeling <em>slightly concerned.</em></p></div><span className="status orange"><i /> CONCERNED</span></div><div className="metrics"><Metric label="TOTAL SPENT" value={money(total)} foot="+12.4% vs last month" accent="lime-text" /><Metric label="ROAST LEVEL" value="76" foot="FINANCIAL MENACE" accent="orange-text" /><Metric label="TRANSACTIONS" value={transactions.length} foot="This month" /><Metric label="TOP CATEGORY" value="FOOD" foot="29% of spending" accent="lime-text" /></div><div className="dashboard-grid"><Card className="chart-card"><div className="section-head"><div><span className="eyebrow">CASH FLOW / AUGUST 2026</span><h2>SPENDING OVERVIEW</h2></div><div className="segmented"><button>WEEK</button><button className="active">MONTH</button><button>YEAR</button></div></div><Chart /></Card><Card className="roast-card"><div className="roast-mark">//</div><span className="eyebrow">TODAY'S FINANCIAL OBSERVATION</span><h2>Your spending this week suggests you're financially optimistic and mathematically unavailable.</h2><div className="intensity"><span>ROAST INTENSITY</span><b>████████░░</b><strong>76%</strong></div></Card></div><Card className="recent"><div className="section-head"><div><span className="eyebrow">LIVE LEDGER</span><h2>RECENT TRANSACTIONS</h2></div><Link to="/transactions" className="text-link">VIEW ALL <ArrowRight size={15} /></Link></div><TransactionRows items={transactions.slice(0, 4)} /></Card></> }
function TransactionRows({ items, onEdit, onDelete }) { return <div className="tx-list">{items.map((item) => <div className="tx-row" key={item.id}><div className="merchant-icon">{iconFor(item.category)}</div><div className="tx-name"><strong>{item.merchant}</strong><small>{item.category} · {item.date}</small></div><span className="tx-time">{item.time}</span><strong className={`tx-amount ${item.type === 'income' ? 'income-text' : ''}`}>{item.type === 'income' ? '+' : '-'}{money(Math.abs(item.amount))}</strong>{onEdit && <button className="icon-button" onClick={() => onEdit(item)}><Pencil size={15} /></button>}{onDelete && <button className="icon-button danger-button" onClick={() => onDelete(item.id)}><Trash2 size={15} /></button>}</div>)}</div> }
function Transactions({ transactions, setTransactions }) { const [query, setQuery] = useState(''); const [category, setCategory] = useState('All'); const [modal, setModal] = useState(null); const [form, setForm] = useState({ merchant: '', amount: '', category: 'Food', type: 'expense', date: '2026-09-02', time: '12:00' }); const filtered = useMemo(() => transactions.filter((item) => item.merchant.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || item.category === category)), [transactions, query, category]); const save = (event) => { event.preventDefault(); const item = { ...form, amount: Number(form.amount), id: modal?.id || `tx-${Date.now()}` }; const next = modal?.id ? transactions.map((tx) => tx.id === modal.id ? item : tx) : [item, ...transactions]; setTransactions(next); setModal(null); setForm({ merchant: '', amount: '', category: 'Food', type: 'expense', date: '2026-09-02', time: '12:00' }) }; const edit = (item) => { setForm({ ...item, type: item.type || 'expense' }); setModal(item) }; const remove = (id) => { if (window.confirm('Delete this transaction? The evidence will be removed.')) setTransactions(transactions.filter((item) => item.id !== id)) }; return <><div className="page-intro compact-intro"><div><p className="eyebrow">THE FULL DAMAGE REPORT</p><h1>TRANSACTIONS</h1><p className="lead">Every decision. Unfortunately documented.</p></div><button className="button lime" onClick={() => setModal({})}><Plus size={17} /> ADD TRANSACTION</button></div><div className="filters"><div className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search merchants" /></div><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><span className="result-count">{filtered.length} transactions</span></div><Card className="transaction-card"><TransactionRows items={filtered} onEdit={edit} onDelete={remove} /></Card>{modal && <Modal title={modal.id ? 'EDIT TRANSACTION' : 'ADD TRANSACTION'} close={() => setModal(null)}><form className="modal-form" onSubmit={save}><label>Merchant<input required value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} /></label><label>Amount (₹)<input required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label><label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="form-row"><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Time<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label></div><button type="button" className="button lime" onClick={save}>SAVE TRANSACTION <Check size={16} /></button></form></Modal>}</> }
function Modal({ title, close, children }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="section-head"><h2>{title}</h2><button className="icon-button" onClick={close}><X size={18} /></button></div>{children}</div></div> }
function Analytics({ transactions }) { const categoriesTotal = categories.map((name) => ({ name, total: transactions.filter((item) => item.category === name).reduce((sum, item) => sum + item.amount, 0) })).filter((item) => item.total).sort((a, b) => b.total - a.total); return <><div className="page-intro compact-intro"><div><p className="eyebrow">PATTERNS, EXPOSED</p><h1>THE NUMBERS ARE TALKING.</h1><p className="lead">Unfortunately, they're talking about you.</p></div></div><div className="analytics-grid"><Card><div className="section-head"><h2>CATEGORY BREAKDOWN</h2><span className="eyebrow">AUGUST</span></div><div className="donut"><div><strong>{money(transactions.reduce((s, t) => s + t.amount, 0))}</strong><small>TOTAL SPENT</small></div></div><div className="legend">{categoriesTotal.slice(0, 5).map((item, i) => <span key={item.name}><i className={`dot d${i}`} />{item.name}<b>{money(item.total)}</b></span>)}</div></Card><Card className="trend"><div className="section-head"><h2>SPENDING TREND</h2><span className="eyebrow">LAST 30 DAYS</span></div><Chart compact /></Card></div><div className="insights"><Insight label="MOST DANGEROUS DAY" value="SATURDAY" foot="You spend 42% more." color="orange" /><Insight label="LATE NIGHT SPENDING" value="₹8,240" foot="After 10 PM." color="purple" /><Insight label="IMPULSE PURCHASES" value="14" foot="We're concerned." color="red" /></div></> }
function Insight({ label, value, foot, color }) { return <Card className={`insight ${color}`}><span className="eyebrow">{label}</span><strong>{value}</strong><small>{foot}</small></Card> }
function Personality() { return <><div className="page-intro compact-intro"><div><p className="eyebrow">THE DIAGNOSIS</p><h1>YOUR FINANCIAL PERSONALITY.</h1></div></div><Card className="personality-hero"><div><span className="eyebrow">PRIMARY TYPE / 01</span><h2>THE EMOTIONAL SPENDER</h2><p>You don't always spend because you need something. Sometimes your bank account just becomes emotionally available.</p></div><div className="score-ring"><strong>76</strong><small>ROAST<br />LEVEL</small></div></Card><div className="scores">{[['IMPULSE', 78], ['DISCIPLINE', 34], ['CHAOS', 91]].map(([label, value]) => <Card key={label}><span className="eyebrow">{label}</span><strong>{value}%</strong><div className="progress"><i style={{ width: `${value}%` }} /></div></Card>)}</div><h2 className="subheading">WHY WE THINK THIS</h2><div className="insights"><Insight label="YOU SPEND MORE AT NIGHT" value="4 purchases" foot="after midnight." color="purple" /><Insight label="FOOD IS YOUR COMFORT CATEGORY" value="₹14,280" foot="this month." color="orange" /><Insight label="SMALL PURCHASES ADD UP" value="23" foot="transactions under ₹300." color="lime" /></div></> }
function Achievements() { return <><div className="page-intro compact-intro"><div><p className="eyebrow">PROOF OF HABITS</p><h1>ACHIEVEMENTS.</h1><p className="lead">Congratulations. These are not necessarily good things.</p></div></div><div className="achievement-grid">{demoData.achievements.map((item) => <Card className={item.unlocked ? 'achievement unlocked' : 'achievement locked'} key={item.title}><div className="achievement-icon">{item.icon === 'moon' ? <Moon size={20} /> : item.icon === 'bolt' ? <Bolt size={20} /> : <Lock size={18} />}</div><span className="eyebrow">{item.unlocked ? 'UNLOCKED' : 'LOCKED'}</span><h2>{item.title}</h2><p>{item.description}</p>{item.progress && <small className="progress-text">{item.progress}</small>}</Card>)}</div></> }
function Wrapped() { const [slide, setSlide] = useState(0); const slides = [['AUGUST 2026', '₹30,250', 'You spent this much.'], ['YOUR BIGGEST WEAKNESS', 'FOOD', '₹14,280'], ['MOST QUESTIONABLE PURCHASE', '₹1,299', 'At 1:42 AM.'], ['YOUR PERSONALITY', 'THE EMOTIONAL SPENDER', 'No further questions.'], ['ROAST LEVEL', '76%', 'FINANCIAL MENACE'], ['FINAL VERDICT', 'YOU\'RE NOT BROKE.', 'You\'re just extremely committed to unnecessary experiences.']]; useEffect(() => { const handler = (e) => { if (e.key === 'ArrowRight') setSlide((value) => Math.min(5, value + 1)); if (e.key === 'ArrowLeft') setSlide((value) => Math.max(0, value - 1)) }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, []); const current = slides[slide]; return <div className="wrapped"><div className="wrapped-top"><span className="eyebrow">YOUR MONEY WRAPPED</span><span className="slide-count">0{slide + 1} / 06</span></div><div className="wrapped-stage"><span className="eyebrow">{current[0]}</span><strong>{current[1]}</strong><p>{current[2]}</p><div className="wrapped-line" /></div><div className="wrapped-controls"><button className="button outline" disabled={slide === 0} onClick={() => setSlide(slide - 1)}><ChevronLeft size={16} /> PREVIOUS</button><div className="slide-dots">{slides.map((_, i) => <i className={i === slide ? 'active' : ''} key={i} />)}</div><button className="button lime" disabled={slide === 5} onClick={() => setSlide(slide + 1)}>NEXT <ChevronRight size={16} /></button></div></div> }
function Settings() { const user = getUser() || demoData.user; const [intensity, setIntensity] = useState(getPreferences().intensity); return <><div className="page-intro compact-intro"><div><p className="eyebrow">CONTROL ROOM</p><h1>SETTINGS</h1></div></div><Card className="settings-card"><div className="setting"><div><span className="eyebrow">PROFILE</span><h2>{user.name}</h2><p>{user.email}</p></div><UserRound size={20} /></div><div className="setting"><div><span className="eyebrow">ROAST PREFERENCES</span><h2>How honest should we be?</h2><p>Your wallet has requested a gentler approach.</p></div><div className="segmented preference">{['MILD', 'SAVAGE', 'BRUTAL'].map((item) => <button className={intensity === item ? 'active' : ''} onClick={() => { setIntensity(item); savePreferences({ intensity: item }) }} key={item}>{item}</button>)}</div></div><div className="setting"><div><span className="eyebrow">APPEARANCE</span><h2>DARK MODE</h2><p>The only mode with enough self-awareness.</p></div><span className="status lime-status"><i /> DEFAULT</span></div></Card></> }
function Protected({ children, isAuthenticated, authReady }) {
  if (!authReady) return null
  return isAuthenticated ? <Shell>{children}</Shell> : <Navigate to="/login" replace />
}
function App() {
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState('');
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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
        if (active) {
          setTransactions(rows)
        }
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

      if (error) {
        console.error('[Auth] Session check failed:', error)
      }

      setSession(currentSession)
      if (currentSession?.user) {
        saveUser(buildUserFromSupabase(currentSession.user))
      } else {
        clearUser()
      }
      setAuthReady(true)
    }

    syncSession()

    const { data: { subscription } } = supabase
      ? supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession)
          if (nextSession?.user) {
            saveUser(buildUserFromSupabase(nextSession.user))
          } else {
            clearUser()
          }
        })
      : { data: { subscription: null } }

    return () => {
      isMounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const handleAddTransaction = async (payload) => {
    if (!session?.user) return

    try {
      const created = await createUserTransaction(session.user.id, payload)
      setTransactions((current) => [...created, ...current])
      return created
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

    const updated = await updateUserTransaction(session.user.id, transactionId, payload)
    setTransactions((current) => current.map((item) => updated[0]?.id === item.id ? updated[0] : item))
    return updated
  }

  return <BrowserRouter><Routes><Route path="/login" element={authReady && session ? <Navigate to="/dashboard" replace /> : <Auth mode="login" />} /><Route path="/signup" element={authReady && session ? <Navigate to="/dashboard" replace /> : <Auth mode="signup" />} /><Route path="*" element={<Protected isAuthenticated={Boolean(session)} authReady={authReady}><Routes><Route path="/dashboard" element={<DashboardPage transactions={transactions} onAdd={handleAddTransaction} />} /><Route path="/transactions" element={<TransactionManager transactions={transactions} setTransactions={setTransactions} loading={transactionsLoading} fetchError={transactionsError} onCreateTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />} /><Route path="/analytics" element={<AnalyticsPage transactions={transactions} />} /><Route path="/personality" element={<PersonalityPage transactions={transactions} />} /><Route path="/achievements" element={<AchievementsPage transactions={transactions} />} /><Route path="/wrapped" element={<WrappedPage transactions={transactions} />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></Protected>} /></Routes></BrowserRouter>
}

export default App
