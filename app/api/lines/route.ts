import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('lines')
    .select('*')
    .order('stat')
    .order('player')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get unique games
  const games = [...new Set((data || []).map((r: any) => r.game))].filter(Boolean)

  // Group into PropRow format: one row per player+stat+game, books as keys
  const grouped: Record<string, any> = {}
  for (const row of data || []) {
    const key = `${row.player}__${row.stat}__${row.game}`
    if (!grouped[key]) {
      grouped[key] = {
        player: row.player,
        stat: row.stat,
        game: row.game,
        home_team: row.home_team,
        away_team: row.away_team,
        lines: {}
      }
    }
    grouped[key].lines[row.bookmaker] = {
      line: row.line,
      over: row.over_odds,
      under: row.under_odds,
    }
  }

  const { data: settings } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'last_updated')
  .single()

  const lastUpdated = settings?.value || null

  return NextResponse.json({
    rows: Object.values(grouped),
    games,
    lastUpdated,
  })
}
