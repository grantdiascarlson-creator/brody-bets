import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getSupabaseWithUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// GET — fetch all picks + check if user is admin
export async function GET() {
  const { user } = await getSupabaseWithUser()

  let isAdmin = false
  let isSubscriber = false

  if (user) {
    const { data: access } = await serviceClient
      .from('user_access')
      .select('subscribed, override, is_admin')
      .eq('id', user.id)
      .single()

    isAdmin = !!(access?.is_admin)
    isSubscriber = !!(access?.subscribed || access?.override || access?.is_admin)
  }

  if (!isSubscriber) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: picks, error } = await serviceClient
    .from('picks')
    .select('*')
    .order('game_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ picks, isAdmin })
}

// POST — add a new pick (admin only)
export async function POST(request: NextRequest) {
  const { user } = await getSupabaseWithUser()

  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: access } = await serviceClient
    .from('user_access')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!access?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()

  const { data: pick, error } = await serviceClient
    .from('picks')
    .insert({
      player:    body.player,
      stat:      body.stat,
      line:      body.line,
      direction: body.direction,
      odds:      body.odds,
      ev:       body.ev ?? null,
      bookmaker: body.bookmaker,
      units:     body.units,
      game_date: body.game_date,
      notes:     body.notes || null,
      result:    'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pick })
}

// PATCH — update result (admin only)
export async function PATCH(request: NextRequest) {
  const { user } = await getSupabaseWithUser()

  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: access } = await serviceClient
    .from('user_access')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!access?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()

  const { error } = await serviceClient
    .from('picks')
    .update({
      result:        body.result,
      actual_result: body.actual_result ?? null,
    })
    .eq('id', body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { user } = await getSupabaseWithUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: access } = await serviceClient
    .from('user_access')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!access?.is_admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()

  const { error } = await serviceClient
    .from('picks')
    .delete()
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
