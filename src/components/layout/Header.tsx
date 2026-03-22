'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';

export function Header() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;

    return (
        <header className="h-[52px] px-4 md:px-8 flex items-center justify-between bg-white/70 backdrop-blur-2xl border-b border-[#E5E5EA]/60 sticky top-0 z-40 transition-all">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-slate-400">
                <div className="w-10 md:hidden" />
                <div className="hidden md:flex items-center gap-2">
                    <span className="cursor-pointer hover:text-slate-600 transition-colors">系統</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-800">工程總覽</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-2.5">
                {/* Role Badge */}
                {userRole && (
                    <Badge variant="outline" className={`text-[10px] font-semibold border-transparent ${userRole === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                        {userRole === 'admin' ? 'Admin' : 'Staff'}
                    </Badge>
                )}

                {/* Search */}
                <div className="relative hidden sm:block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜尋項目..."
                        className="pl-8 pr-4 py-1.5 w-32 md:w-56 text-[13px] bg-black/[0.03] border border-transparent rounded-[10px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all placeholder:text-slate-400 text-slate-700 shadow-inner shadow-black/[0.01]"
                    />
                </div>
                <button className="sm:hidden p-2 text-slate-500 hover:bg-black/5 hover:text-slate-700 rounded-lg transition-colors">
                    <Search size={18} />
                </button>

                {/* Notification */}
                <button className="p-2 bg-transparent rounded-full text-slate-500 hover:bg-black/5 hover:text-slate-700 transition-colors relative">
                    <Bell size={18} strokeWidth={1.5} />
                    <span className="absolute top-[7px] right-[9px] w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>
            </div>
        </header>
    );
}
