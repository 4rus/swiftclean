import '../styles/globals.css'
export const metadata = { title: 'CleanTrack — INDIMOE Cleaning', description: 'Cleaning business management portal' }
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 }
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>
}
