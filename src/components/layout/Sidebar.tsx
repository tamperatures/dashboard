'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    FolderKanban,
    CalendarDays,
    FileText,
    Settings,
    HardHat,
    Menu,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
    { href: '/', label: '工程總覽', icon: LayoutDashboard },
    { href: '/projects', label: '項目管理', icon: FolderKanban },
    { href: '/crm', label: '客戶管理', icon: Users },
    { href: '/calendar', label: '工程日程', icon: CalendarDays },
    { href: '/media', label: '文件資料', icon: FileText },
    { href: '/settings', label: '系統設定', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);

    const SidebarContent = () => (
        <div className="flex flex-col h-full py-6">
            {/* App Logo */}
            <div className="mb-8 w-full px-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                        <HardHat className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">適度裝修</h1>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">工程管理系統</p>
                    </div>
                </div>
                {/* Mobile Close Button */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Section Label */}
            <div className="px-6 mb-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">主選單</span>
            </div>

            {/* Navigation */}
            <nav className="w-full px-3 space-y-1 flex-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                                isActive
                                    ? 'bg-slate-900 text-white shadow-sm font-medium'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            )}
                        >
                            <Icon
                                size={16}
                                className={cn(
                                    'shrink-0',
                                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                                )}
                                strokeWidth={isActive ? 2.5 : 2}
                            />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="w-full px-5 mt-auto space-y-4 pt-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>本月項目</span>
                        <span>8 / 15</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 rounded-full" style={{ width: '53%' }} />
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Angel" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 leading-none truncate">Angel</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">管理員</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Hamburger Button (fixed top left) */}
            <div className="md:hidden fixed top-0 left-0 z-50 p-2.5">
                <button
                    onClick={toggleSidebar}
                    className="p-2 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-[240px] shrink-0 border-r border-slate-200 bg-white min-h-screen flex-col sticky top-0 h-screen">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden"
                        />
                        {/* Sliding Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed top-0 left-0 w-[280px] h-full bg-white shadow-2xl z-50 md:hidden flex flex-col"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
