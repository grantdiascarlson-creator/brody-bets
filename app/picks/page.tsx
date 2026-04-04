'use client'

import { useEffect, useState, useRef } from 'react'
import Nav from '@/components/Nav'
import styles from './picks.module.css'

type Pick = {
  id: number
  player: string
  stat: string
  line: number
  direction: string
  odds: number
  ev: number | null
  bookmaker: string
  units: number
  result: 'win' | 'loss' | 'pending'
  actual_result: number | null
  game_date: string
  submitted_at: string
  notes: string | null
}

const STAT_LABELS: Record<string, string> = {
  points: 'Points', rebounds: 'Rebounds', assists: 'Assists',
  threePointersMade: '3PM', blocks: 'Blocks', steals: 'Steals',
  turnovers: 'Turnovers', 'points+rebounds': 'Pts+Reb',
  'points+assists': 'Pts+Ast', 'points+rebounds+assists': 'PRA',
  'rebounds+assists': 'Reb+Ast', 'blocks+steals': 'Blk+Stl',
}

function calcStake(odds: number, units: number): number {
  if (odds > 0) return 100 * units
  return (Math.abs(odds) / 100) * 100 * units
}

function calcPnl(odds: number, units: number, result: string): number {
  if (result === 'pending') return 0
  if (result === 'win') return 100 * units
  return -calcStake(odds, units)
}

function MultiDropdown({
  label, options, selected, onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(val: string) {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val))
    else onChange([...selected, val])
  }

  const displayLabel = selected.length === 0
    ? label
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label || selected[0])
      : `${label} (${selected.length})`

  return (
    <div className={styles.dropdownWrap} ref={ref}>
      <button
        className={`${styles.dropdownBtn} ${selected.length > 0 ? styles.dropdownActive : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        {displayLabel}
        <span className={styles.dropdownArrow}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.dropdownMenu}>
          {options.map(o => (
            <label key={o.value} className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className={styles.checkbox}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PicksPage() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statFilter, setStatFilter] = useState<string[]>([])
  const [bookFilter, setBookFilter] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minEv, setMinEv] = useState('')
  const [maxEv, setMaxEv] = useState('')

  const [form, setForm] = useState({
    player: '', stat: 'points', line: '', direction: 'over',
    odds: '', ev: '', bookmaker: '', units: '1',
    game_date: new Date().toISOString().split('T')[0], notes: ''
  })

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/picks')
      const data = await res.json()
      setPicks(data.picks || [])
      setIsAdmin(data.isAdmin || false)
      setLoading(false)
    }
    load()
  }, [])

  const availableStats = [...new Set(picks.map(p => p.stat))].sort()
  const availableBooks = [...new Set(picks.map(p => p.bookmaker))].sort()

  const filtered = picks.filter(p => {
    if (statFilter.length > 0 && !statFilter.includes(p.stat)) return false
    if (bookFilter.length > 0 && !bookFilter.includes(p.bookmaker)) return false
    if (startDate && p.game_date < startDate) return false
    if (endDate && p.game_date > endDate) return false
    if (minEv && (p.ev == null || p.ev < parseFloat(minEv))) return false
    if (maxEv && (p.ev == null || p.ev > parseFloat(maxEv))) return false
    return true
  })

  const summary = filtered.reduce((acc, p) => {
    acc.total++
    if (p.result === 'win') acc.wins++
    else if (p.result === 'loss') acc.losses++
    else acc.pending++
    acc.pnl += calcPnl(p.odds, p.units, p.result)
    if (p.result !== 'pending') acc.staked += calcStake(p.odds, p.units)
    return acc
  }, { total: 0, wins: 0, losses: 0, pending: 0, pnl: 0, staked: 0 })

  const roi = summary.staked > 0 ? (summary.pnl / summary.staked) * 100 : 0

  const hasFilters = statFilter.length > 0 || bookFilter.length > 0 || startDate || endDate || minEv || maxEv

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        line: parseFloat(form.line),
        odds: parseInt(form.odds),
        ev: form.ev ? parseFloat(form.ev) : null,
        units: parseFloat(form.units),
      })
    })
    if (res.ok) {
      const data = await res.json()
      setPicks(prev => [data.pick, ...prev])
      setShowForm(false)
      setForm({
        player: '', stat: 'points', line: '', direction: 'over',
        odds: '', ev: '', bookmaker: '', units: '1',
        game_date: new Date().toISOString().split('T')[0], notes: ''
      })
    }
    setSubmitting(false)
  }

  async function updateResult(id: number, result: string) {
    await fetch('/api/picks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, result })
    })
    setPicks(prev => prev.map(p => p.id === id ? { ...p, result: result as any } : p))
  }

  async function deletePick(id: number) {
    if (!confirm('Delete this pick?')) return
    await fetch('/api/picks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setPicks(prev => prev.filter(p => p.id !== id))
  }

  return (
    <>
      <Nav />

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1>My Picks</h1>
          <p>Tracked bets with results — updated after each game</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>Record</div>
            <div className={styles.pillVal}>
              {summary.wins}-{summary.losses}{summary.pending > 0 ? `-${summary.pending}` : ''}
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>P&amp;L</div>
            <div className={`${styles.pillVal} ${summary.pnl >= 0 ? styles.pos : styles.neg}`}>
              {summary.pnl >= 0 ? '+' : ''}${summary.pnl.toFixed(0)}
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>ROI</div>
            <div className={`${styles.pillVal} ${roi >= 0 ? styles.pos : styles.neg}`}>
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
            </div>
          </div>
        </div>
        {isAdmin && (
          <button className={styles.addBtn} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : '+ Add pick'}
          </button>
        )}
      </div>

      <div className={styles.controls}>
        <MultiDropdown
          label="Stat"
          options={availableStats.map(s => ({ value: s, label: STAT_LABELS[s] || s }))}
          selected={statFilter}
          onChange={setStatFilter}
        />
        <MultiDropdown
          label="Book"
          options={availableBooks.map(b => ({ value: b, label: b }))}
          selected={bookFilter}
          onChange={setBookFilter}
        />
        <div className={styles.dateGroup}>
          <span className={styles.filterLabel}>From</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateInput} />
        </div>
        <div className={styles.dateGroup}>
          <span className={styles.filterLabel}>To</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateInput} />
        </div>
        <div className={styles.dateGroup}>
          <span className={styles.filterLabel}>EV%</span>
          <input type="number" step="0.1" value={minEv} onChange={e => setMinEv(e.target.value)} className={styles.dateInput} placeholder="Min" style={{ width: 70 }} />
          <span className={styles.filterLabel}>–</span>
          <input type="number" step="0.1" value={maxEv} onChange={e => setMaxEv(e.target.value)} className={styles.dateInput} placeholder="Max" style={{ width: 70 }} />
        </div>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={() => {
            setStatFilter([])
            setBookFilter([])
            setStartDate('')
            setEndDate('')
            setMinEv('')
            setMaxEv('')
          }}>
            Clear
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Player</label>
              <input value={form.player} onChange={e => setForm(f => ({ ...f, player: e.target.value }))} placeholder="LeBron James" required />
            </div>
            <div className={styles.field}>
              <label>Stat</label>
              <select value={form.stat} onChange={e => setForm(f => ({ ...f, stat: e.target.value }))}>
                {Object.entries(STAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Line</label>
              <input type="number" step="0.5" value={form.line} onChange={e => setForm(f => ({ ...f, line: e.target.value }))} placeholder="25.5" required />
            </div>
            <div className={styles.field}>
              <label>Direction</label>
              <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
                <option value="over">Over</option>
                <option value="under">Under</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Odds</label>
              <input type="number" value={form.odds} onChange={e => setForm(f => ({ ...f, odds: e.target.value }))} placeholder="-110" required />
            </div>
            <div className={styles.field}>
              <label>EV %</label>
              <input type="number" step="0.1" value={form.ev} onChange={e => setForm(f => ({ ...f, ev: e.target.value }))} placeholder="5.2" />
            </div>
            <div className={styles.field}>
              <label>Book</label>
              <input value={form.bookmaker} onChange={e => setForm(f => ({ ...f, bookmaker: e.target.value }))} placeholder="bet365" required />
            </div>
            <div className={styles.field}>
              <label>Units</label>
              <input type="number" step="0.5" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} placeholder="1" required />
            </div>
            <div className={styles.field}>
              <label>Date</label>
              <input type="date" value={form.game_date} onChange={e => setForm(f => ({ ...f, game_date: e.target.value }))} required />
            </div>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Pick'}
          </button>
        </form>
      )}

      <div className={styles.tableWrap}>
        {loading && <div className={styles.loading}>Loading picks...</div>}
        {!loading && filtered.length === 0 && <div className={styles.loading}>No picks found.</div>}
        {!loading && filtered.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Stat</th>
                <th>Line</th>
                <th>Dir</th>
                <th>Odds</th>
                <th>EV%</th>
                <th>Book</th>
                <th>Units</th>
                <th>Stake</th>
                <th>Result</th>
                <th>P&amp;L</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const pnl = calcPnl(p.odds, p.units, p.result)
                const stake = calcStake(p.odds, p.units)
                return (
                  <tr key={p.id}>
                    <td className={styles.mutedCell}>
                      <div>{p.game_date}</div>
                      {p.submitted_at && (
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          Added {new Date(p.submitted_at).toLocaleString('en-US', {
                            timeZone: 'America/New_York',
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                            hour12: true
                          })} ET
                        </div>
                      )}
                    </td>
                    <td className={styles.playerCell}>{p.player}</td>
                    <td className={styles.mutedCell}>{STAT_LABELS[p.stat] || p.stat}</td>
                    <td>{p.line}</td>
                    <td>
                      <span className={p.direction === 'over' ? styles.dirOver : styles.dirUnder}>
                        {p.direction}
                      </span>
                    </td>
                    <td>{p.odds > 0 ? `+${p.odds}` : p.odds}</td>
                    <td>
                      {p.ev != null ? (
                        <span className={p.ev > 0 ? styles.pos : styles.neg}>
                          {p.ev > 0 ? '+' : ''}{p.ev.toFixed(1)}%
                        </span>
                      ) : <span className={styles.mutedCell}>—</span>}
                    </td>
                    <td><span className={styles.bookBadge}>{p.bookmaker}</span></td>
                    <td>{p.units}u</td>
                    <td className={styles.mutedCell}>${stake.toFixed(0)}</td>
                    <td>
                      <span className={
                        p.result === 'win' ? styles.win :
                        p.result === 'loss' ? styles.loss :
                        styles.pending
                      }>
                        {p.result.charAt(0).toUpperCase() + p.result.slice(1)}
                      </span>
                    </td>
                    <td>
                      {p.result !== 'pending' ? (
                        <span className={pnl >= 0 ? styles.pos : styles.neg}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                        </span>
                      ) : (
                        <span className={styles.mutedCell}>—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.winBtn} onClick={() => updateResult(p.id, 'win')}>W</button>
                          <button className={styles.lossBtn} onClick={() => updateResult(p.id, 'loss')}>L</button>
                          <button className={styles.deleteBtn} onClick={() => deletePick(p.id)}>✕</button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
