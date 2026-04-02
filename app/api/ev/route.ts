import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  // Check if user is logged in and approved/override
  const { data: { user } } = await supabase.auth.getUser()
  let subscribed = false

  if (user) {
    const { data: access } = await supabase
      .from('user_access')
      .select('approved, override')
      .eq('id', user.id)
      .single()

    subscribed = !!(access?.approved || access?.override)
  }

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

  return NextResponse.json({ rows, games, books, stats, subscribed })
}
