import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars missing, allow through in dev
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase env vars not found in middleware')
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /ev route
  if (request.nextUrl.pathname.startsWith('/ev')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if user is approved
    const { data: access } = await supabase
      .from('user_access')
      .select('approved, override')
      .eq('id', user.id)
      .single()

    if (!access?.approved && !access?.override) {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/ev/:path*'],
}
