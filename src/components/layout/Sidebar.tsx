'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, Users, FolderKanban, CalendarDays,
    FileText, Settings, HardHat, Menu, X, LogOut, UserCog, Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
    { href: '/', label: '工程總覽', icon: LayoutDashboard },
    { href: '/projects', label: '項目管理', icon: FolderKanban },
    { href: '/crm', label: '客戶管理', icon: Users },
    { href: '/calendar', label: '工程日程', icon: CalendarDays },
    { href: '/media', label: '文件資料', icon: FileText },
    { href: '/employees', label: '員工管理', icon: UserCog, adminOnly: true },
    { href: '/settings', label: '系統設定', icon: Settings },
] as const;

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { data: session } = useSession();

    const userRole = (session?.user as any)?.role || 'staff';
    const userName = session?.user?.name || '用戶';

    const toggleSidebar = () => setIsOpen(!isOpen);

    const filteredNavItems = (NAV_ITEMS as unknown as NavItem[]).filter(
        (item) => !item.adminOnly || userRole === 'admin'
    );

    const SidebarContent = () => (
        <div className="flex flex-col h-full py-5">
            {/* Logo */}
            <div className="mb-6 w-full px-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1D1D1F] flex items-center justify-center shadow-md">
                        <HardHat className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold tracking-tight text-[#1D1D1F] leading-none">適度裝修</h1>
                        <p className="text-[10px] text-[#86868B] font-medium mt-0.5">工程管理系統</p>
                    </div>
                </div>
                <button onClick={toggleSidebar} className="md:hidden p-2 text-[#86868B] hover:bg-[#F5F5F7] rounded-xl transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="w-full px-3 space-y-1 flex-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group',
                                isActive
                                    ? 'bg-[#0071E3] text-white shadow-sm shadow-[#0071E3]/25'
                                    : 'text-[#424245] hover:bg-[#E8E8ED] active:scale-[0.98]'
                            )}
                        >
                            <Icon size={20} className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-[#86868B] group-hover:text-[#424245]')} strokeWidth={isActive ? 2.2 : 1.8} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="w-full px-4 mt-auto pt-4">
                <div className="p-3 rounded-2xl bg-[#F5F5F7] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E8E8ED] overflow-hidden shrink-0">
                        <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#1D1D1F] leading-none truncate">{userName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            {userRole === 'admin' && <Shield className="h-2.5 w-2.5 text-amber-500" />}
                            <p className="text-[10px] text-[#86868B] truncate">{userRole === 'admin' ? '管理員' : '員工'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="p-2 rounded-xl text-[#86868B] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        title="登出"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="md:hidden fixed top-0 left-0 z-50 p-2 sm:p-3 flex items-center h-[56px]">
                <button onClick={toggleSidebar} className="p-1.5 sm:p-2.5 bg-white/90 backdrop-blur-xl border border-[#D1D1D6]/50 shadow-sm sm:shadow-lg rounded-xl sm:rounded-2xl text-[#1D1D1F] hover:bg-white transition-all active:scale-95">
                    <Menu className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
                </button>
            </div>

            <aside className="hidden md:flex w-[250px] shrink-0 border-r border-[#D1D1D6]/40 bg-white/80 backdrop-blur-2xl min-h-screen flex-col sticky top-0 h-screen">
                <SidebarContent />
            </aside>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 md:hidden" />
                        <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className="fixed top-0 left-0 w-[280px] h-full bg-white shadow-2xl z-50 md:hidden flex flex-col rounded-r-3xl">
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
