import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter'
})

// Using Playfair Display for the elegant serif headings shown in the reference
const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair'
})

export const metadata: Metadata = {
    title: '適度裝修 | 工程管理系統',
    description: '適度裝修設計 — 現代化工程管理系統',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="zh-HK">
            <body className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-slate-50/50 flex`}>
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen">
                    <Header />
                    <main className="p-6 md:p-8 flex-1 overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
