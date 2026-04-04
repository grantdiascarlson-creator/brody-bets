'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import styles from './Nav.module.css'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>Brody Bets</Link>
      <Link href="/lines" className={`${styles.navLink} ${pathname === '/lines' ? styles.active : ''}`}>
        Lines
      </Link>
      <Link href="/ev" className={`${styles.navLink} ${pathname === '/ev' ? styles.active : ''}`}>
        EV Table
      </Link>
      <Link href="/picks" className={`${styles.navLink} ${pathname === '/picks' ? styles.active : ''}`}>
        Picks
      </Link>
      <div className={styles.navRight}>
        {email ? (
          <>
            <span className={styles.userBadge}>{email}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link href="/login" className={styles.userBadge}>Log in</Link>
            <Link href="/signup" className={styles.subBtn}>Subscribe</Link>
          </>
        )}
      </div>
    </nav>
  )
}
