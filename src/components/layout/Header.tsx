'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
import {
    Search, Bell, X, ChevronRight, FolderKanban,
    Clock, FileText, ArrowRight, Loader2, Command, HardHat
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/* ───────── Route → Breadcrumb Map ───────── */
const ROUTE_MAP: Record<string, { label: string; parent?: string }> = {
    '/': { label: '工程總覽' },
    '/projects': { label: '項目管理' },
    '/crm': { label: '客戶管理' },
    '/calendar': { label: '日程與任務' },
    '/media': { label: '文件資料' },
    '/employees': { label: '員工管理' },
    '/settings': { label: '系統設定' },
    '/change-password': { label: '更改密碼', parent: '/settings' },
};

/* ───────── Notification Types ───────── */
interface Notification {
    id: string;
    title: string;
    description: string;
    time: string;
    read: boolean;
    type: 'stage' | 'file' | 'system';
    projectId?: string;
}

/* ───────── Search Result ───────── */
interface SearchResult {
    id: string;
    projectCode: string;
    clientName: string;
    estate: string;
    stage: string;
}

export function Header() {
    const { user, userData } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const userRole = userData?.role || 'staff';
    const userName = userData?.name || user?.displayName || user?.email?.split('@')[0] || '用戶';

    // ── Search State ──
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ── Notification State ──
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notifRef = useRef<HTMLDivElement>(null);

    // ── Breadcrumbs ──
    // ── Session Sync (Auto-Update Role/Department) ──
    // Handled natively by Firebase Auth ID Token updates now.
    const getBreadcrumbs = () => {
        // Handle dynamic project routes
        if (pathname.startsWith('/projects/') && pathname !== '/projects') {
            return [
                { label: '項目管理', href: '/projects' },
                { label: '項目詳情' },
            ];
        }
        const route = ROUTE_MAP[pathname];
        if (!route) return [{ label: '系統' }];

        const crumbs: { label: string; href?: string }[] = [];
        if (route.parent && ROUTE_MAP[route.parent]) {
            crumbs.push({ label: ROUTE_MAP[route.parent].label, href: route.parent });
        }
        crumbs.push({ label: route.label });
        return crumbs;
    };

    // ── Search Logic ──
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                const lq = q.toLowerCase();
                const filtered = (data.projects || []).filter((p: any) =>
                    p.projectCode?.toLowerCase().includes(lq) ||
                    p.clientName?.toLowerCase().includes(lq) ||
                    p.estate?.toLowerCase().includes(lq)
                ).slice(0, 6);
                setSearchResults(filtered);
            }
        } catch { /* ignore */ } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, doSearch]);

    // ── Keyboard shortcut for search (Ctrl/Cmd + K) ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
                setNotifOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // ── Click outside to close ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Load Notifications (from recent project logs) ──
    useEffect(() => {
        const loadNotifications = async () => {
            try {
                const res = await fetch('/api/projects');
                if (!res.ok) return;
                const data = await res.json();
                const allNotifs: Notification[] = [];

                for (const project of (data.projects || [])) {
                    const logs = project.stageLogs || [];
                    for (const log of logs.slice(-5)) {
                        allNotifs.push({
                            id: log.id,
                            title: `${project.projectCode} — ${project.clientName}`,
                            description: log.description,
                            time: log.timestamp,
                            read: false,
                            type: log.description?.includes('檔案') ? 'file' : 'stage',
                            projectId: project.id,
                        });
                    }
                }
                // Sort by time descending, take latest 20
                allNotifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
                setNotifications(allNotifs.slice(0, 20));
            } catch { /* ignore */ }
        };
        loadNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const formatTimeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return '剛剛';
        if (mins < 60) return `${mins} 分鐘前`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} 小時前`;
        const days = Math.floor(hrs / 24);
        return `${days} 天前`;
    };

    const getStageLabel = (stage: string) => {
        const map: Record<string, string> = {
            'S01_客戶查詢': 'S01', 'S02_見客前準備': 'S02', 'S03_見客出QUOTE': 'S03',
            'S04_落訂及設計': 'S04', 'S05_入則及批則': 'S05', 'P06_工程施工': 'S06',
            'S07_完工驗收': 'S07', 'S08_保養期': 'S08',
        };
        return map[stage] || stage?.slice(0, 3) || '—';
    };

    const breadcrumbs = getBreadcrumbs();

    const NAV_ITEMS = [
        { href: '/', label: '總覽' },
        { href: '/projects', label: '項目' },
        { href: '/crm', label: '客戶' },
        { href: '/calendar', label: '日程' },
        { href: '/schedule', label: '排程' },
        { href: '/media', label: '文件' },
        ...(userRole === 'admin' ? [{ href: '/employees', label: '員工' }] : []),
        { href: '/settings', label: '設定' },
    ];

    return (
        <>
            <header className="h-[64px] px-6 lg:px-10 flex items-center justify-between sticky top-0 z-40 w-full transition-all duration-300 pointer-events-auto bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
                
                {/* Left: Breadcrumbs */}
                <div className="flex items-center gap-2">
                    {breadcrumbs.map((crumb, idx) => (
                        <React.Fragment key={idx}>
                            {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span className={`text-[15px] font-bold ${idx === breadcrumbs.length - 1 ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700 cursor-pointer transition-colors'}`}>
                                {crumb.label}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 justify-end">
                    {/* User Badge */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 shadow-sm">
                        <span className="text-[13px] font-bold text-amber-700">{userName}</span>
                        <span className="text-[11px] font-bold bg-amber-200/50 text-amber-700 px-1.5 py-0.5 rounded-md">
                            {userRole === 'admin' ? '管理員' : '員工'}
                        </span>
                    </div>

                    {/* Search Button */}
                    <div ref={searchRef} className="relative">
                        <button
                            onClick={() => {
                                setSearchOpen(!searchOpen);
                                setNotifOpen(false);
                                setTimeout(() => searchInputRef.current?.focus(), 100);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                        >
                            <Search className="w-[14px] h-[14px]" strokeWidth={2.5} />
                            <span className="text-[13px] font-semibold">搜尋</span>
                            <span className="text-[10px] font-bold bg-white text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm flex items-center ml-1">
                                ⌘K
                            </span>
                        </button>

                        {/* Search Dropdown - Light Theme */}
                        {searchOpen && (
                            <div className="fixed left-4 right-4 top-[64px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[380px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50"
                                style={{ animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                            >
                                {/* Search Input */}
                                <div className="flex items-center gap-2.5 p-3 border-b border-slate-100 bg-slate-50/50">
                                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="搜尋項目編號、客戶名稱..."
                                        className="flex-1 text-[14px] font-medium bg-transparent outline-none placeholder:text-slate-400 text-slate-700"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors bg-slate-200/50">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Results */}
                                <div className="max-h-[320px] overflow-y-auto bg-white">
                                    {searching ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                        </div>
                                    ) : !searchQuery ? (
                                        <div className="px-4 py-8 text-center text-[12px] font-medium text-slate-400">
                                            快速搜尋您的裝修專案
                                        </div>
                                    ) : searchResults.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-[13px] font-medium text-slate-400">
                                            找不到符合的項目
                                        </div>
                                    ) : (
                                        <div className="py-2">
                                            {searchResults.map(r => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => {
                                                        router.push(`/projects/${r.id}`);
                                                        setSearchOpen(false);
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-l-2 border-transparent hover:border-blue-500"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[14px] font-bold text-slate-800 truncate">{r.projectCode}</span>
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{getStageLabel(r.stage)}</span>
                                                        </div>
                                                        <p className="text-[12px] font-medium text-slate-500 truncate">
                                                            {r.clientName} · {r.estate}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notification Button */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => { setNotifOpen(!notifOpen); setSearchOpen(false); }}
                            className="relative text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-full p-2"
                        >
                            <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
                            {unreadCount > 0 && (
                                <span className="absolute top-[4px] right-[4px] w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white">
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown - Light Theme */}
                        {notifOpen && (
                            <div className="fixed left-4 right-4 top-[64px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[380px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50"
                                style={{ animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                            >
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-[13px] font-bold text-slate-800">通知</h3>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead} className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                            全部已讀
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[360px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <p className="text-[12px] font-medium text-slate-400">暫無通知</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 bg-white">
                                            {notifications.map(notif => (
                                                <button
                                                    key={notif.id}
                                                    onClick={() => {
                                                        if (notif.projectId) {
                                                            router.push(`/projects/${notif.projectId}`);
                                                            setNotifOpen(false);
                                                        }
                                                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                                    }}
                                                    className={`w-full flex flex-col px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-[13px] font-bold text-slate-800 truncate pr-4">{notif.title}</p>
                                                        {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm" />}
                                                    </div>
                                                    <p className="text-[12px] font-medium text-slate-500 line-clamp-2 leading-relaxed">{notif.description}</p>
                                                    <span className="text-[10px] font-semibold text-slate-400 mt-2 block">{formatTimeAgo(notif.time)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <style jsx global>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
