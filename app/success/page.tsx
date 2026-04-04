'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'
import styles from '../auth.module.css'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success'>('loading')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      router.push('/ev')
      return
    }

    setTimeout(() => {
      setStatus('success')
      setTimeout(() => router.push('/ev'), 2000)
    }, 2000)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, margin: '16px 0' }}>
          {status === 'loading' ? '⏳' : '✓'}
        </div>
        <h1 className={styles.title}>
          {status === 'loading' ? 'Setting up your account...' : 'Welcome to Brody Bets!'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>
          {status === 'loading'
            ? 'Processing your subscription...'
            : 'Redirecting you to the EV table...'}
        </p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<div style={{ color: 'var(--muted)', padding: 32 }}>Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </>
  )
}
