'use client';

import React from 'react';
import { Search, Bell } from 'lucide-react';

export function Header() {
    return (
        <header className="h-14 px-4 md:px-8 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
            {/* Left: Spacer on mobile to account for hamburger, Breadcrumbs on desktop */}
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-slate-400">
                <div className="w-10 md:hidden" /> {/* Spacer for mobile hamburger button */}
                <div className="hidden md:flex items-center gap-2">
                    <span className="cursor-pointer hover:text-slate-600 transition-colors">系統</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-800">工程總覽</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-2.5">
                {/* Search */}
                <div className="relative hidden sm:block">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜尋項目..."
                        className="pl-8 pr-4 py-1.5 w-32 md:w-44 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-all placeholder:text-slate-400 text-slate-700"
                    />
                </div>
                {/* Mobile Search Icon */}
                <button className="sm:hidden p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors">
                    <Search size={18} />
                </button>

                {/* Notification */}
                <button className="p-2 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm relative">
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>
            </div>
        </header>
    );
}
