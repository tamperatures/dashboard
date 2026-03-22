import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { LayoutShell } from '@/components/layout/LayoutShell'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter'
})

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
            <body className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-[#F5F5F7]`}>
                <AuthProvider>
                    <ToastProvider>
                        <LayoutShell>
                            {children}
                        </LayoutShell>
                    </ToastProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
