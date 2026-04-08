'use client'

import { useEffect, useState, useRef } from 'react'
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
  market_type: string
}

type SortKey = keyof EVRow

function calcEvPct(ev: number, odds: number): number {
  const stake = odds > 0 ? 100 : Math.abs(odds)
  return (ev / stake) * 100
}

function MultiDropdown({
  label,
  options,
  selected,
  onChange,
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

export default function EVPage() {
  const [rows, setRows] = useState<EVRow[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [statFilter, setStatFilter] = useState<string[]>([])
  const [bookFilter, setBookFilter] = useState<string[]>([])
  const [scenarioFilter, setScenarioFilter] = useState<string[]>([])
  const [marketFilter, setMarketFilter] = useState<string[]>([])
  const [playerFilter, setPlayerFilter] = useState('')
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

  const hasFilters = teamFilter.length > 0 || statFilter.length > 0 || bookFilter.length > 0 ||
    scenarioFilter.length > 0 || marketFilter.length > 0 || posOnly || playerFilter !== ''

  function clearFilters() {
    setTeamFilter([])
    setStatFilter([])
    setBookFilter([])
    setScenarioFilter([])
    setMarketFilter([])
    setPosOnly(false)
    setPlayerFilter('')
  }

  const filtered = rows
    .filter(r => {
      if (teamFilter.length > 0 && !teamFilter.includes(r.game)) return false
      if (statFilter.length > 0 && !statFilter.includes(r.stat)) return false
      if (bookFilter.length > 0 && !bookFilter.includes(r.bookmaker)) return false
      if (scenarioFilter.length > 0) {
        if (scenarioFilter.includes('default') && !scenarioFilter.includes('alt') && r.scenario !== 'Default') return false
        if (scenarioFilter.includes('alt') && !scenarioFilter.includes('default') && r.scenario === 'Default') return false
      }
      if (marketFilter.length > 0 && !marketFilter.includes(r.market_type)) return false
      if (posOnly && r.ev <= 0) return false
      if (playerFilter && !r.player.toLowerCase().includes(playerFilter.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortKey === 'ev') {
        return (calcEvPct(a.ev, a.odds) - calcEvPct(b.ev, b.odds)) * sortDir
      }
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
      <th className={active ? styles.sorted : ''} onClick={() => handleSort(col)}>
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
            <div className={styles.pillVal}>{Math.ceil(games.length / 2)}</div>
          </div>
          {lastUpdated && (
            <div className={styles.statPill}>
              <div className={styles.pillLabel}>Last updated</div>
              <div className={styles.pillVal} style={{ fontSize: 13, paddingTop: 4 }}>
                {new Date(lastUpdated).toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                  hour12: true
                })} ET
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <MultiDropdown
          label="Team"
          options={games.map(g => ({ value: g, label: g }))}
          selected={teamFilter}
          onChange={setTeamFilter}
        />
        <MultiDropdown
          label="Stat"
          options={stats.map(s => ({ value: s.key, label: s.label }))}
          selected={statFilter}
          onChange={setStatFilter}
        />
        <MultiDropdown
          label="Book"
          options={books.map(b => ({ value: b, label: b }))}
          selected={bookFilter}
          onChange={setBookFilter}
        />
        <MultiDropdown
          label="Scenario"
          options={[
            { value: 'default', label: 'Default' },
            { value: 'alt', label: 'Injury scenarios' },
          ]}
          selected={scenarioFilter}
          onChange={setScenarioFilter}
        />
        <MultiDropdown
          label="Market"
          options={[
            { value: 'standard', label: 'Standard O/U' },
            { value: 'alternate', label: 'Alternate (X+)' },
          ]}
          selected={marketFilter}
          onChange={setMarketFilter}
        />
        <input
          type="text"
          value={playerFilter}
          onChange={e => setPlayerFilter(e.target.value)}
          placeholder="Search player..."
          className={styles.playerSearch}
        />
        <button
          className={`${styles.toggleBtn} ${posOnly ? styles.on : ''}`}
          onClick={() => setPosOnly(v => !v)}
        >
          + EV only
        </button>
        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters}>
            Clear
          </button>
        )}
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
                <SortTh col="market_type" label="Market" />
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
                  <td>
                    <span className={r.market_type === 'alternate' ? styles.scenAlt : styles.scenDefault}>
                      {r.market_type === 'alternate' ? 'Alt' : 'O/U'}
                    </span>
                  </td>
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
                      {r.ev > 0 ? '+' : ''}{calcEvPct(r.ev, r.odds).toFixed(1)}%
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
              <div className={styles.feature}><div className={styles.featureDot} />Alternate line EV (X+ points)</div>
              <div className={styles.feature}><div className={styles.featureDot} />Injury scenario projections</div>
              <div className={styles.feature}><div className={styles.featureDot} />Updated daily before tip-off</div>
            </div>
            <button className={styles.ctaBtn} onClick={async () => {
              const res = await fetch('/api/stripe/checkout', { method: 'POST' })
              const data = await res.json()
              if (data.url) window.location.href = data.url
              else window.location.href = '/login'
            }}>
              Subscribe — $5 / month
            </button>
            <div className={styles.ctaNote}>Already subscribed? <a href="/login" style={{ color: 'var(--gold)' }}>Log in</a></div>
          </div>
        </div>
      )}
    </>
  )
}
