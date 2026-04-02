import './globals.css'

export const metadata = {
  title: 'Brody Bets',
  description: 'NBA player prop EV finder — updated daily',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
