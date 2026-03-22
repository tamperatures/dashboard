'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/layout/AuthProvider';
import {
    Search, Bell, X, ChevronRight, FolderKanban,
    Clock, FileText, ArrowRight, Loader2, Command,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/* ───────── Route → Breadcrumb Map ───────── */
const ROUTE_MAP: Record<string, { label: string; parent?: string }> = {
    '/': { label: '工程總覽' },
    '/projects': { label: '項目管理' },
    '/crm': { label: '客戶管理' },
    '/calendar': { label: '工程日程' },
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
            'S04_落訂及設計': 'S04', 'S05_入則及批則': 'S05', 'S06_工程施工': 'S06',
            'S07_完工驗收': 'S07', 'S08_保養期': 'S08',
        };
        return map[stage] || stage?.slice(0, 3) || '—';
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="h-[56px] px-4 md:px-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40">
            {/* Left: Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 min-w-0">
                <div className="w-10 md:hidden" />
                <div className="hidden md:flex items-center gap-1.5">
                    {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                            {crumb.href ? (
                                <button
                                    onClick={() => router.push(crumb.href!)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors truncate"
                                >
                                    {crumb.label}
                                </button>
                            ) : (
                                <span className="text-slate-800 font-semibold truncate">{crumb.label}</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {/* Role Badge */}
                {userRole && (
                    <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-semibold tracking-wide flex items-center ${userRole === 'admin'
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50'
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/50'
                        }`}>
                        <span className="truncate max-w-[60px] sm:max-w-none">{userName}</span>
                        <span className="hidden sm:inline ml-1.5 opacity-60">{userRole === 'admin' ? '管理員' : '職員'}</span>
                    </div>
                )}

                {/* ═══ Search Button ═══ */}
                <div ref={searchRef} className="relative">
                    <button
                        onClick={() => {
                            setSearchOpen(!searchOpen);
                            setNotifOpen(false);
                            setTimeout(() => searchInputRef.current?.focus(), 100);
                        }}
                        className={`flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-xl text-[13px] transition-all duration-200 ${searchOpen
                            ? 'bg-white shadow-lg shadow-black/5 ring-1 ring-slate-200'
                            : 'bg-slate-100/70 hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-slate-400">搜尋</span>
                        <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/80 border border-slate-200/60 text-[10px] text-slate-400 font-mono ml-1">
                            <Command className="w-2.5 h-2.5" />K
                        </kbd>
                    </button>

                    {/* Search Dropdown */}
                    {searchOpen && (
                        <div className="fixed left-4 right-4 top-[64px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[380px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/60 overflow-hidden z-50"
                            style={{ animation: 'slideDown 0.2s ease-out' }}
                        >
                            {/* Search Input */}
                            <div className="flex items-center gap-2.5 p-3 border-b border-slate-100">
                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="搜尋項目編號、客戶名稱、屋苑..."
                                    className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Results */}
                            <div className="max-h-[320px] overflow-y-auto">
                                {searching ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                    </div>
                                ) : !searchQuery ? (
                                    <div className="px-4 py-6 text-center">
                                        <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[12px] text-slate-400">
                                            輸入項目編號、客戶名稱或屋苑名搜尋
                                        </p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-[13px] text-slate-400">找不到符合的項目</p>
                                    </div>
                                ) : (
                                    <div className="py-1.5">
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                            項目結果 ({searchResults.length})
                                        </div>
                                        {searchResults.map(r => (
                                            <button
                                                key={r.id}
                                                onClick={() => {
                                                    router.push(`/projects/${r.id}`);
                                                    setSearchOpen(false);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shrink-0 border border-blue-100/50">
                                                    <FolderKanban className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-semibold text-slate-800 truncate">{r.projectCode}</span>
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{getStageLabel(r.stage)}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                        {r.clientName} · {r.estate}
                                                    </p>
                                                </div>
                                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══ Notification Button ═══ */}
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => { setNotifOpen(!notifOpen); setSearchOpen(false); }}
                        className={`relative p-2 rounded-xl transition-all duration-200 ${notifOpen
                            ? 'bg-white shadow-lg shadow-black/5 ring-1 ring-slate-200 text-slate-800'
                            : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-700'
                            }`}
                    >
                        <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-500/30">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {notifOpen && (
                        <div className="fixed left-4 right-4 top-[64px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[380px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/60 overflow-hidden z-50"
                            style={{ animation: 'slideDown 0.2s ease-out' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                <h3 className="text-[14px] font-bold text-slate-800">通知</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-[12px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                    >
                                        全部已讀
                                    </button>
                                )}
                            </div>

                            {/* Notification List */}
                            <div className="max-h-[360px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                                            <Bell className="w-5 h-5 text-slate-300" />
                                        </div>
                                        <p className="text-[13px] text-slate-400">暫無通知</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {notifications.map(notif => (
                                            <button
                                                key={notif.id}
                                                onClick={() => {
                                                    if (notif.projectId) {
                                                        router.push(`/projects/${notif.projectId}`);
                                                        setNotifOpen(false);
                                                    }
                                                    setNotifications(prev =>
                                                        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                                                    );
                                                }}
                                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!notif.read ? 'bg-blue-50/30' : ''
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${notif.type === 'stage'
                                                    ? 'bg-indigo-50 text-indigo-500'
                                                    : notif.type === 'file'
                                                        ? 'bg-emerald-50 text-emerald-500'
                                                        : 'bg-slate-50 text-slate-400'
                                                    }`}>
                                                    {notif.type === 'file' ? <FileText className="w-4 h-4" /> : <FolderKanban className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-semibold text-slate-700 truncate">{notif.title}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notif.description}</p>
                                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTimeAgo(notif.time)}
                                                    </div>
                                                </div>
                                                {!notif.read && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Animation keyframes */}
            <style jsx global>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </header>
    );
}
