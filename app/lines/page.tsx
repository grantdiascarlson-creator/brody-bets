'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import styles from './lines.module.css'

const BOOKS = ['bet365', 'draftkings', 'fanduel', 'betmgm', 'betrivers']

const STAT_LABELS: Record<string, string> = {
  points: 'Points',
  rebounds: 'Rebounds',
  assists: 'Assists',
  threePointersMade: 'Three Pointers Made',
  blocks: 'Blocks',
  steals: 'Steals',
  turnovers: 'Turnovers',
  'points+rebounds': 'Points + Rebounds',
  'points+assists': 'Points + Assists',
  'points+rebounds+assists': 'Points + Rebounds + Assists',
  'rebounds+assists': 'Rebounds + Assists',
  'blocks+steals': 'Blocks + Steals',
}

type BookLine = {
  line: number
  over: string
  under: string
}

type PropRow = {
  player: string
  stat: string
  game: string
  home_team: string
  away_team: string
  lines: Record<string, BookLine | null>
}

export default function LinesPage() {
  const [rows, setRows] = useState<PropRow[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [playerFilter, setPlayerFilter] = useState('')
  const [games, setGames] = useState<string[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/lines')
      const data = await res.json()
      setRows(data.rows || [])
      setGames(data.games || [])
      setLastUpdated(data.lastUpdated || null)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter(r => {
    if (gameFilter && r.game !== gameFilter) return false
    if (statFilter && r.stat !== statFilter) return false
    if (playerFilter && !r.player.toLowerCase().includes(playerFilter.toLowerCase())) return false
    return true
  })

  const statGroups: Record<string, PropRow[]> = {}
  filtered.forEach(r => {
    if (!statGroups[r.stat]) statGroups[r.stat] = []
    statGroups[r.stat].push(r)
  })

  function bestOver(row: PropRow): string | null {
    let best = -Infinity, bestBook = null
    BOOKS.forEach(b => {
      const l = row.lines[b]
      if (!l || !l.over) return
      const v = parseInt(l.over.replace('+', ''))
      if (!isNaN(v) && v > best) { best = v; bestBook = b }
    })
    return bestBook
  }

  function bestUnder(row: PropRow): string | null {
    let best = -Infinity, bestBook = null
    BOOKS.forEach(b => {
      const l = row.lines[b]
      if (!l || !l.under) return
      const v = parseInt(l.under.replace('+', ''))
      if (!isNaN(v) && v > best) { best = v; bestBook = b }
    })
    return bestBook
  }

  return (
    <>
      <Nav />

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1>Lines</h1>
          <p>NBA player prop lines compared across all books</p>
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

      <div className={styles.controls}>
        <span className={styles.filterLabel}>Game</span>
        <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}>
          <option value="">All games</option>
          {games.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className={styles.filterLabel}>Stat</span>
        <select value={statFilter} onChange={e => setStatFilter(e.target.value)}>
          <option value="">All stats</option>
          {Object.entries(STAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className={styles.filterLabel}>Player</span>
        <input
          type="text"
          value={playerFilter}
          onChange={e => setPlayerFilter(e.target.value)}
          placeholder="Search player..."
          className={styles.playerSearch}
        />
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.loading}>Loading lines...</div>}
        {!loading && Object.entries(statGroups).map(([stat, statRows]) => (
          <div key={stat} className={styles.statSection}>
            <div className={styles.statHeader}>{STAT_LABELS[stat] || stat}</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Player</th>
                    <th className={styles.thLeft}>Stat</th>
                    {BOOKS.map(b => <th key={b}>{b}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {statRows.map((row, i) => {
                    const boBook = bestOver(row)
                    const buBook = bestUnder(row)
                    return (
                    <tr key={i}>
                      <td className={styles.playerCell}>
                        {row.player}
                        <span className={styles.gameTag}>{row.away_team} @ {row.home_team}</span>
                      </td>
                      <td className={styles.mutedCell}>{STAT_LABELS[row.stat] || row.stat}</td>
                      {BOOKS.map(b => {
                        const l = row.lines[b]
                        if (!l) return <td key={b} className={styles.empty}>—</td>
                        return (
                          <td key={b}>
                            <div className={styles.cellWrap}>
                              <span className={styles.cellLine}>{l.line}</span>
                              <span className={b === boBook ? styles.bestOver : styles.over}>O {l.over}</span>
                              <span className={b === buBook ? styles.bestUnder : styles.under}>U {l.under}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!loading && Object.keys(statGroups).length === 0 && (
          <div className={styles.loading}>No props found for this selection.</div>
        )}
      </div>
    </>
  )
}
