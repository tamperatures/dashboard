'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Trash2,
    Loader2,
    ImageIcon,
    ZoomIn,
    FolderOpen,
    ChevronLeft,
    File,
    Download,
    Folder,
    FileText,
} from 'lucide-react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

interface ProjectFolder {
    id: string;
    projectCode: string;
    clientName: string;
    estate: string;
    files: ProjectFile[];
    photoCount: number;
    docCount: number;
}

interface ProjectFile {
    id: string;
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
    size: number;
}

export default function MediaPage() {
    const [folders, setFolders] = useState<ProjectFolder[]>([]);
    const [activeFolder, setActiveFolder] = useState<ProjectFolder | null>(null);
    const [activeCategory, setActiveCategory] = useState<'photo' | 'quotation' | 'drawing' | 'other' | null>(null);
    const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const toast = useToast();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            const projectFolders: ProjectFolder[] = (data.projects || [])
                .filter((p: any) => p.files && p.files.length > 0)
                .map((p: any) => ({
                    id: p.id,
                    projectCode: p.projectCode,
                    clientName: p.clientName,
                    estate: p.estate,
                    files: p.files,
                    photoCount: p.files.filter((f: any) => f.type === 'photo').length,
                    docCount: p.files.filter((f: any) => f.type !== 'photo').length,
                }));
            setFolders(projectFolders);
        } catch {
            setFolders([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFile = async (fileId: string, fileName: string) => {
        if (!activeFolder) return;
        const confirmed = await confirm({
            title: '刪除檔案',
            description: `確定要刪除「${fileName}」嗎？此操作無法撤銷。`,
            variant: 'danger',
            confirmText: '刪除',
        });
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/projects/${activeFolder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deleteFileId: fileId })
            });
            if (res.ok) {
                // Update local state
                const updatedFiles = activeFolder.files.filter(f => f.id !== fileId);
                const updatedFolder = {
                    ...activeFolder,
                    files: updatedFiles,
                    photoCount: updatedFiles.filter(f => f.type === 'photo').length,
                    docCount: updatedFiles.filter(f => f.type !== 'photo').length,
                };
                setActiveFolder(updatedFolder);
                setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
                setPreviewFile(null);
            }
        } catch {
            toast.error('刪除失敗');
        }
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const isImageFile = (file: ProjectFile) => file.type === 'photo';

    const getFilteredFiles = () => {
        if (!activeFolder || !activeCategory) return [];
        if (activeCategory === 'photo') return activeFolder.files.filter(f => f.type === 'photo');
        if (activeCategory === 'quotation') return activeFolder.files.filter(f => f.type === 'quotation' || f.type === 'contract');
        if (activeCategory === 'drawing') return activeFolder.files.filter(f => f.type === 'drawing');
        if (activeCategory === 'other') return activeFolder.files.filter(f => f.type === 'other' || !['photo', 'quotation', 'contract', 'drawing'].includes(f.type));
        return [];
    };

    const totalFiles = folders.reduce((sum, f) => sum + f.files.length, 0);
    const totalPhotos = folders.reduce((sum, f) => sum + f.photoCount, 0);
    const totalDocs = folders.reduce((sum, f) => sum + f.docCount, 0);

    return (
        <>
            <motion.div
                className="max-w-[1600px] mx-auto space-y-6 pb-12"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        {activeFolder ? (
                            <>
                                <button
                                    onClick={() => {
                                        if (activeCategory) setActiveCategory(null);
                                        else setActiveFolder(null);
                                    }}
                                    className="flex items-center gap-1.5 text-[14px] text-[#0071e3] hover:text-[#0077ED] font-medium mb-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] rounded-md px-1 -ml-1"
                                >
                                    <ChevronLeft className="w-4 h-4" /> {activeCategory ? '返回資料夾層級' : '返回媒體庫'}
                                </button>
                                <h1 className="apple-display text-[28px] sm:text-[32px] font-semibold text-[#1D1D1F] tracking-tight flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#0071e3] to-blue-600 flex items-center justify-center shadow-md shadow-[#0071e3]/20">
                                        <FolderOpen className="w-5 h-5 text-white" />
                                    </div>
                                    {activeFolder.projectCode} — {activeFolder.clientName}
                                </h1>
                                <p className="text-[14px] text-[#86868B] mt-1">{activeFolder.estate} · {activeFolder.files.length} 個檔案</p>
                            </>
                        ) : (
                            <>
                                <h1 className="apple-display text-[28px] sm:text-[32px] font-semibold text-[#1D1D1F] tracking-tight">媒體庫</h1>
                                <p className="text-[14px] text-[#86868B] mt-1">依專案分類管理所有文件與照片</p>
                            </>
                        )}
                    </div>
                    {!activeFolder && (
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>{folders.length} 個專案</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>{totalFiles} 個檔案</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="text-blue-500 animate-spin" />
                    </div>
                ) : !activeFolder ? (
                    /* ─── Folder Grid View ─── */
                    folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <FolderOpen size={36} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-400">尚無專案檔案</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-sm">
                                在專案詳情頁上傳文件或照片後，它們將會顯示在此。
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {folders.map((folder) => {
                                // Find a thumbnail from the first photo
                                const thumb = folder.files.find(f => f.type === 'photo');
                                return (
                                    <Card
                                        key={folder.id}
                                        className="group cursor-pointer border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] rounded-[24px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-white transition-all duration-300 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                                        onClick={() => setActiveFolder(folder)}
                                    >
                                        {/* Folder thumbnail or placeholder */}
                                        <div className="aspect-[4/3] bg-[#F5F5F7] relative overflow-hidden">
                                            {thumb ? (
                                                <img
                                                    src={thumb.url}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-[#F5F5F7]">
                                                    <Folder className="w-12 h-12 text-[#D1D1D6]" />
                                                </div>
                                            )}
                                            {/* File count badges */}
                                            <div className="absolute bottom-3 right-3 flex gap-2">
                                                {folder.photoCount > 0 && (
                                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px] bg-black/60 text-white backdrop-blur-md">
                                                        📷 {folder.photoCount}
                                                    </span>
                                                )}
                                                {folder.docCount > 0 && (
                                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px] bg-black/60 text-white backdrop-blur-md">
                                                        📄 {folder.docCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <CardContent className="p-4">
                                            <p className="text-[15px] font-semibold text-[#1D1D1F] truncate">{folder.projectCode}</p>
                                            <p className="text-[13px] text-[#86868B] mt-0.5 truncate">{folder.clientName} · {folder.estate}</p>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )
                ) : (
                    /* ─── Inside a Folder ─── */
                    activeCategory === null ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                            {[
                                { id: 'photo', name: '現場照片相簿', count: activeFolder.files.filter(f => f.type === 'photo').length, icon: <ImageIcon className="w-8 h-8 text-blue-500" /> },
                                { id: 'quotation', name: '報價單與合約', count: activeFolder.files.filter(f => ['quotation', 'contract'].includes(f.type)).length, icon: <FileText className="w-8 h-8 text-emerald-500" /> },
                                { id: 'drawing', name: '設計圖則', count: activeFolder.files.filter(f => f.type === 'drawing').length, icon: <FileText className="w-8 h-8 text-purple-500" /> },
                                { id: 'other', name: '客戶來料與雜項', count: activeFolder.files.filter(f => !['photo', 'quotation', 'contract', 'drawing'].includes(f.type)).length, icon: <Folder className="w-8 h-8 text-slate-500" /> },
                            ].map(cat => (
                                <Card 
                                    key={cat.id} 
                                    className="cursor-pointer border-none shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] bg-white transition-all duration-300 rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] group"
                                    onClick={() => setActiveCategory(cat.id as any)}
                                >
                                    <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 aspect-[4/3]">
                                        <div className="w-16 h-16 rounded-[16px] bg-[#F5F5F7] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            {cat.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-[#1D1D1F] tracking-wide">{cat.name}</h3>
                                            <p className="text-xs text-[#86868B] mt-1">{cat.count} 個檔案</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Tab bar replacement for breadcrumbs */}
                            <div className="flex gap-2">
                                {(<span className="px-4 py-2 rounded-[980px] text-[13px] font-medium bg-[#1D1D1F] text-white shadow-sm">
                                    {activeCategory === 'photo' ? '現場照片相簿' : activeCategory === 'quotation' ? '報價單與合約' : activeCategory === 'drawing' ? '設計圖則' : '客戶來料與雜項'} ({getFilteredFiles().length})
                                </span>)}
                            </div>

                            {getFilteredFiles().length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                        <ImageIcon className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-400">此分類暫無檔案</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {getFilteredFiles().map((file) => (
                                        isImageFile(file) ? (
                                            /* Photo card */
                                            <div
                                                key={file.id}
                                                className="group relative aspect-square rounded-[24px] overflow-hidden bg-[#F5F5F7] cursor-pointer shadow-none hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300"
                                                onClick={() => setPreviewFile(file)}
                                            >
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                                    <p className="text-white text-[13px] font-medium truncate">{file.name}</p>
                                                    <p className="text-white/60 text-[11px]">{formatSize(file.size)}</p>
                                                </div>
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg">
                                                        <ZoomIn size={14} className="text-[#1D1D1F]" />
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.name); }}
                                                        className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={14} className="text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Document card */
                                            <div
                                                key={file.id}
                                                className="group relative rounded-[24px] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 p-5 flex flex-col items-center justify-center text-center gap-3 aspect-square cursor-pointer"
                                                onClick={() => window.open(file.url, '_blank')}
                                            >
                                                <div className="w-14 h-14 rounded-[12px] bg-[#E8E8ED] flex items-center justify-center">
                                                    <File className="w-7 h-7 text-[#0071e3]" />
                                                </div>
                                                <div className="min-w-0 w-full">
                                                    <p className="text-[13px] font-semibold text-[#1D1D1F] truncate">{file.name}</p>
                                                    <p className="text-[11px] text-[#86868B] mt-1">
                                                        {file.type === 'quotation' ? '報價單' : file.type === 'drawing' ? '圖則' : file.type === 'contract' ? '合約' : '文件'} · {formatSize(file.size)}
                                                    </p>
                                                </div>
                                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <a href={file.url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center hover:bg-[#E8E8ED] transition-colors" onClick={e => e.stopPropagation()}>
                                                        <Download size={14} className="text-[#1D1D1F]" />
                                                    </a>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.name); }}
                                                        className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </>
                    )
                )}

                {/* Full-screen Preview Dialog */}
                <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                    <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-black/95 border-0">
                        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-white text-sm font-medium truncate pr-8">
                                    {previewFile?.name}
                                </DialogTitle>
                            </div>
                        </DialogHeader>

                        {previewFile && (
                            <div className="flex items-center justify-center min-h-[50vh] max-h-[80vh] p-4 pt-16">
                                <img
                                    src={previewFile.url}
                                    alt={previewFile.name}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            </div>
                        )}

                        {previewFile && (
                            <div className="p-4 border-t border-white/10 flex items-center justify-between">
                                <div className="text-sm text-white/60">
                                    {formatSize(previewFile.size)} · {new Date(previewFile.uploadedAt).toLocaleDateString('zh-HK')}
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteFile(previewFile.id, previewFile.name)}
                                    className="gap-1.5"
                                >
                                    <Trash2 size={14} />
                                    刪除
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
            {ConfirmDialogComponent}
        </>
    );
}
