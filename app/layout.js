import './globals.css'

export const metadata = {
  title: 'Sol™ - Your AI Business Partner',
  description: 'AI-powered coaching and intuition amplifier built on the Aligned Business® Method',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}