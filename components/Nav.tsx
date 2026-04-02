'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.css'

type User = {
  email: string
} | null

export default function Nav({ user }: { user: User }) {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>Brody Bets</Link>
      <Link href="/lines" className={`${styles.navLink} ${pathname === '/lines' ? styles.active : ''}`}>
        Lines
      </Link>
      <Link href="/ev" className={`${styles.navLink} ${pathname === '/ev' ? styles.active : ''}`}>
        EV Table
      </Link>
      <div className={styles.navRight}>
        {user ? (
          <span className={styles.userBadge}>{user.email}</span>
        ) : (
          <>
            <Link href="/login" className={styles.userBadge}>Log in</Link>
            <Link href="/subscribe" className={styles.subBtn}>Subscribe</Link>
          </>
        )}
      </div>
    </nav>
  )
}
