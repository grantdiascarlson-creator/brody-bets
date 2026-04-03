'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import styles from './ev.module.css'

const FREE_ROWS = 2

const STAT_LABELS: Record<string, string> = {
  points: 'Points',
  rebounds: 'Rebounds',
  assists: 'Assists',
  threePointersMade: '3PM',
  blocks: 'Blocks',
  steals: 'Steals',
  turnovers: 'Turnovers',
  'points+rebounds': 'Pts+Reb',
  'points+assists': 'Pts+Ast',
  'points+rebounds+assists': 'PRA',
  'rebounds+assists': 'Reb+Ast',
  'blocks+steals': 'Blk+Stl',
}

type EVRow = {
  player: string
  stat: string
  line: number
  direction: string
  odds: number
  bookmaker: string
  proj: number
  scenario: string
  q_warning: string | null
  ev: number
  game: string
}

type SortKey = keyof EVRow

export default function EVPage() {
  const [rows, setRows] = useState<EVRow[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [gameFilter, setGameFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [bookFilter, setBookFilter] = useState('')
  const [scenarioFilter, setScenarioFilter] = useState('')
  const [posOnly, setPosOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('ev')
  const [sortDir, setSortDir] = useState(-1)
  const [games, setGames] = useState<string[]>([])
  const [books, setBooks] = useState<string[]>([])
  const [stats, setStats] = useState<{ key: string, label: string }[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
      async function load() {
        const res = await fetch('/api/ev')
        const data = await res.json()
        setRows(data.rows || [])
        setSubscribed(data.subscribed || false)
        setGames(data.games || [])
        setBooks(data.books || [])
        setStats((data.stats || []).map((s: string) => ({ key: s, label: STAT_LABELS[s] || s })))
        setLastUpdated(data.lastUpdated || null)
        setLoading(false)
      }
      load()
    }, [])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(-1) }
  }

  const filtered = rows
    .filter(r => {
      if (gameFilter && r.game !== gameFilter) return false
      if (statFilter && r.stat !== statFilter) return false
      if (bookFilter && r.bookmaker !== bookFilter) return false
      if (scenarioFilter === 'default' && r.scenario !== 'Default') return false
      if (scenarioFilter === 'alt' && r.scenario === 'Default') return false
      if (posOnly && r.ev <= 0) return false
      return true
    })
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sortDir
      return ((av as number) - (bv as number)) * sortDir
    })

  const posCount = rows.filter(r => r.ev > 0 && r.scenario === 'Default').length
  const visibleRows = subscribed ? filtered : filtered.slice(0, FREE_ROWS)
  const showPaywall = !subscribed && filtered.length > FREE_ROWS

  function SortTh({ col, label }: { col: SortKey, label: string }) {
    const active = sortKey === col
    return (
      <th
        className={active ? styles.sorted : ''}
        onClick={() => handleSort(col)}
      >
        {label}{active ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
      </th>
    )
  }

  return (
    <>
      <Nav />

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1>EV Table</h1>
          <p>Positive expected value props — updated daily before tip-off</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>+ EV props</div>
            <div className={styles.pillVal}>{posCount}</div>
          </div>
          <div className={styles.statPill}>
            <div className={styles.pillLabel}>Games today</div>
            <div className={styles.pillVal}>{games.length}</div>
          </div>
          {lastUpdated && (
            <div className={styles.statPill}>
              <div className={styles.pillLabel}>Last updated</div>
              <div className={styles.pillVal} style={{ fontSize: 13, paddingTop: 4 }}>
                {new Date(lastUpdated).toLocaleString('en-US', {
                  month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <span className={styles.filterLabel}>Game</span>
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}>
          <option value="">All games</option>
          {games.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className={styles.filterLabel}>Stat</span>
        <select value={statFilter} onChange={e => setStatFilter(e.target.value)}>
          <option value="">All stats</option>
          {stats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className={styles.filterLabel}>Book</span>
        <select value={bookFilter} onChange={e => setBookFilter(e.target.value)}>
          <option value="">All books</option>
          {books.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className={styles.filterLabel}>Scenario</span>
        <select value={scenarioFilter} onChange={e => setScenarioFilter(e.target.value)}>
          <option value="">All scenarios</option>
          <option value="default">Default only</option>
          <option value="alt">Injury scenarios</option>
        </select>
        <button
          className={`${styles.toggleBtn} ${posOnly ? styles.on : ''}`}
          onClick={() => setPosOnly(v => !v)}
        >
          + EV only
        </button>
      </div>

      <div className={styles.tableWrap}>
        {loading && <div className={styles.loading}>Loading props...</div>}
        {!loading && (
          <table className={styles.table}>
            <thead>
              <tr>
                <SortTh col="player" label="Player" />
                <SortTh col="stat" label="Stat" />
                <SortTh col="line" label="Line" />
                <SortTh col="direction" label="Dir" />
                <SortTh col="odds" label="Odds" />
                <SortTh col="bookmaker" label="Book" />
                <SortTh col="proj" label="Proj" />
                <SortTh col="scenario" label="Scenario" />
                <th>Q Warning</th>
                <SortTh col="ev" label="EV%" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r, i) => (
                <tr key={i}>
                  <td className={styles.playerCell}>{r.player}</td>
                  <td className={styles.mutedCell}>{STAT_LABELS[r.stat] || r.stat}</td>
                  <td>{r.line}</td>
                  <td>
                    <span className={r.direction === 'over' ? styles.dirOver : styles.dirUnder}>
                      {r.direction}
                    </span>
                  </td>
                  <td>{r.odds > 0 ? `+${r.odds}` : r.odds}</td>
                  <td><span className={styles.bookBadge}>{r.bookmaker}</span></td>
                  <td className={styles.mutedCell}>{r.proj}</td>
                  <td>
                    <span className={r.scenario === 'Default' ? styles.scenDefault : styles.scenAlt}>
                      {r.scenario}
                    </span>
                  </td>
                  <td>
                    {r.q_warning
                      ? <span className={styles.qWarn}><span className={styles.qDot} />{r.q_warning}</span>
                      : <span className={styles.empty}>—</span>
                    }
                  </td>
                  <td>
                    <span className={r.ev > 0 ? styles.evPos : styles.evNeg}>
                      {r.ev > 0 ? '+' : ''}{r.ev.toFixed(1)}%
                    </span>
                    {r.ev > 0 && (
                      <span
                        className={styles.evBar}
                        style={{ width: `${Math.min(r.ev * 7, 60)}px` }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPaywall && (
        <div className={styles.paywallWall}>
          <div className={styles.paywallFade} />
          <div className={styles.paywallBox}>
            <h2>Unlock the full EV table</h2>
            <p>See all positive EV props across every book, every game, every day.<br />Cancel anytime.</p>
            <div className={styles.paywallFeatures}>
              <div className={styles.feature}><div className={styles.featureDot} />Full prop table — all books</div>
              <div className={styles.feature}><div className={styles.featureDot} />Injury scenario projections</div>
              <div className={styles.feature}><div className={styles.featureDot} />Q warnings on default scenarios</div>
              <div className={styles.feature}><div className={styles.featureDot} />Updated daily before tip-off</div>
            </div>
            <button className={styles.ctaBtn}>Subscribe — $29 / month</button>
            <div className={styles.ctaNote}>Already subscribed? <a href="/login" style={{ color: 'var(--gold)' }}>Log in</a></div>
          </div>
        </div>
      )}
    </>
  )
}
