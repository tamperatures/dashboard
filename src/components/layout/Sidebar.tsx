'use client';

import React from 'react';
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
} from 'lucide-react';

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

    return (
        <aside className="w-[240px] shrink-0 border-r border-slate-200 bg-white min-h-screen flex flex-col py-6">
            {/* App Logo */}
            <div className="mb-8 w-full px-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <HardHat className="h-4 w-4 text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">適度裝修</h1>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">工程管理系統</p>
                </div>
            </div>

            {/* Section Label */}
            <div className="px-6 mb-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">主選單</span>
            </div>

            {/* Navigation */}
            <nav className="w-full px-3 space-y-1 flex-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
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
            <div className="w-full px-5 mt-auto space-y-4">
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
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Angel" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-700 leading-none">Angel</p>
                        <p className="text-xs text-slate-400 mt-0.5">管理員</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
