// src/app/layout.js
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: 'Jadwal OB',
  description: 'Sistem Jadwal Office Boy',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={geist.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
