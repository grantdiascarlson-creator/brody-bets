import Link from 'next/link'
import styles from '../auth.module.css'

export default function PendingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <Link href="/" className={styles.logo}>Brody Bets</Link>
        <div style={{ fontSize: 40, margin: '16px 0' }}>⏳</div>
        <h1 className={styles.title}>You&apos;re on the list</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          Your account is pending approval. You&apos;ll get access as soon as it&apos;s reviewed —
          usually within 24 hours.
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 24 }}>
          Questions? Reach out at{' '}
          <a href="mailto:brodybets@gmail.com" style={{ color: 'var(--gold)' }}>
            brodybets@gmail.com
          </a>
        </p>
        <Link href="/lines" style={{
          display: 'inline-block',
          marginTop: 32,
          color: 'var(--gold)',
          fontSize: 13,
          borderBottom: '1px solid rgba(201,168,76,0.3)',
          paddingBottom: 2,
        }}>
          Browse free lines while you wait →
        </Link>
      </div>
    </div>
  )
}
