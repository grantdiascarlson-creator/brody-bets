'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import styles from './picks.module.css'

type Pick = {
  id: number
  player: string
  stat: string
  line: number
  direction: string
  odds: number
  bookmaker: string
  units: number
  result: 'win' | 'loss' | 'pending'
  actual_result: number | null
  game_date: string
  notes: string | null
}

type Summary = {
  total: number
  wins: number
  losses: number
  pending: number
  unitsWon: number
  roi: number
}

const STAT_LABELS: Record<string, string> = {
  points: 'Points', rebounds: 'Rebounds', assists: 'Assists',
  threePointersMade: '3PM', blocks: 'Blocks', steals: 'Steals',
  turnovers: 'Turnovers', 'points+rebounds': 'Pts+Reb',
  'points+assists': 'Pts+Ast', 'points+rebounds+assists': 'PRA',
  'rebounds+assists': 'Reb+Ast', 'blocks+steals': 'Blk+Stl',
}

function calcUnits(odds: number, units: number, result: string): number {
  if (result === 'pending') return 0
  if (result === 'loss') return -units
  if (odds > 0) return (odds / 100) * units
  return (100 / Math.abs(odds)) * units
}

export default function PicksPage() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    player: '', stat: 'points', line: '', direction: 'over',
    odds: '', bookmaker: '', units: '1', game_date: new Date().toISOString().split('T')[0], notes: ''
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

  const summary: Summary = picks.reduce((acc, p) => {
    acc.total++
    if (p.result === 'win') acc.wins++
    else if (p.result === 'loss') acc.losses++
    else acc.pending++
    acc.unitsWon += calcUnits(p.odds, p.units, p.result)
    return acc
  }, { total: 0, wins: 0, losses: 0, pending: 0, unitsWon: 0, roi: 0 })

  const settledBets = picks.filter(p => p.result !== 'pending')
  const totalStaked = settledBets.reduce((a, p) => a + p.units, 0)
  summary.roi = totalStaked > 0 ? (summary.unitsWon / totalStaked) * 100 : 0

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
        units: parseFloat(form.units),
      })
    })
    if (res.ok) {
      const data = await res.json()
      setPicks(prev => [data.pick, ...prev])
      setShowForm(false)
      setForm({ player: '', stat: 'points', line: '', direction: 'over', odds: '', bookmaker: '', units: '1', game_date: new Date().toISOString().split('T')[0], notes: '' })
    }
    setSubmitting(false)
  }

  async function updateResult(id: number, result: string, actual_result?: number) {
    await fetch('/api/picks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, result, actual_result })
    })
    setPicks(prev => prev.map(p => p.id === id ? { ...p, result: result as any, actual_result: actual_result ?? p.actual_result } : p))
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
            <div className={styles.pillVal}>{summary.wins}-{summary.losses}{summary.pending > 0 ? `-${summary.pending}` : ''}</div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>Units</div>
            <div className={`${styles.pillVal} ${summary.unitsWon >= 0 ? styles.pos : styles.neg}`}>
              {summary.unitsWon >= 0 ? '+' : ''}{summary.unitsWon.toFixed(1)}u
            </div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>ROI</div>
            <div className={`${styles.pillVal} ${summary.roi >= 0 ? styles.pos : styles.neg}`}>
              {summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(1)}%
            </div>
          </div>
        </div>
        {isAdmin && (
          <button className={styles.addBtn} onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : '+ Add pick'}
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
        {!loading && picks.length === 0 && <div className={styles.loading}>No picks yet.</div>}
        {!loading && picks.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Stat</th>
                <th>Line</th>
                <th>Dir</th>
                <th>Odds</th>
                <th>Book</th>
                <th>Units</th>
                <th>Result</th>
                <th>Actual</th>
                <th>P&L</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {picks.map(p => {
                const pnl = calcUnits(p.odds, p.units, p.result)
                return (
                  <tr key={p.id}>
                    <td className={styles.mutedCell}>{p.game_date}</td>
                    <td className={styles.playerCell}>{p.player}</td>
                    <td className={styles.mutedCell}>{STAT_LABELS[p.stat] || p.stat}</td>
                    <td>{p.line}</td>
                    <td><span className={p.direction === 'over' ? styles.dirOver : styles.dirUnder}>{p.direction}</span></td>
                    <td>{p.odds > 0 ? `+${p.odds}` : p.odds}</td>
                    <td><span className={styles.bookBadge}>{p.bookmaker}</span></td>
                    <td>{p.units}u</td>
                    <td>
                      <span className={
                        p.result === 'win' ? styles.win :
                        p.result === 'loss' ? styles.loss :
                        styles.pending
                      }>
                        {p.result.charAt(0).toUpperCase() + p.result.slice(1)}
                      </span>
                    </td>
                    <td className={styles.mutedCell}>{p.actual_result ?? '—'}</td>
                    <td>
                      {p.result !== 'pending' && (
                        <span className={pnl >= 0 ? styles.pos : styles.neg}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}u
                        </span>
                      )}
                      {p.result === 'pending' && <span className={styles.mutedCell}>—</span>}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.winBtn} onClick={() => {
                            const actual = prompt('Actual result?')
                            updateResult(p.id, 'win', actual ? parseFloat(actual) : undefined)
                          }}>W</button>
                          <button className={styles.lossBtn} onClick={() => {
                            const actual = prompt('Actual result?')
                            updateResult(p.id, 'loss', actual ? parseFloat(actual) : undefined)
                          }}>L</button>
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
