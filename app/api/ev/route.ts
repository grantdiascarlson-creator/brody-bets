import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('props')
    .select('*')
    .order('ev', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []

  const games = [...new Set(rows.map((r: any) => r.game))].filter(Boolean)
  const books = [...new Set(rows.map((r: any) => r.bookmaker))].filter(Boolean)
  const stats = [...new Set(rows.map((r: any) => r.stat))].filter(Boolean)

  return NextResponse.json({
    rows,
    games,
    books,
    stats,
    subscribed: false, // wire up Stripe later
  })
}
