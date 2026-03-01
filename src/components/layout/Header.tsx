'use client';

import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
    return (
        <header className="h-14 px-8 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-widest uppercase text-slate-400">
                <span className="cursor-pointer hover:text-slate-600 transition-colors">系統</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-800">工程總覽</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜尋項目..."
                        className="pl-8 pr-4 py-1.5 w-44 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-all placeholder:text-slate-400 text-slate-700"
                    />
                </div>

                {/* Notification */}
                <button className="p-2 border border-slate-200 bg-white rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm relative">
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>
            </div>
        </header>
    );
}
