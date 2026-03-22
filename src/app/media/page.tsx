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
    const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tab, setTab] = useState<'all' | 'photos' | 'docs'>('all');
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
        if (!activeFolder) return [];
        if (tab === 'photos') return activeFolder.files.filter(f => f.type === 'photo');
        if (tab === 'docs') return activeFolder.files.filter(f => f.type !== 'photo');
        return activeFolder.files;
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
                                    onClick={() => { setActiveFolder(null); setTab('all'); }}
                                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-2 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> 返回媒體庫
                                </button>
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <FolderOpen className="w-5 h-5 text-white" />
                                    </div>
                                    {activeFolder.projectCode} — {activeFolder.clientName}
                                </h1>
                                <p className="text-sm text-slate-400 mt-1">{activeFolder.estate} · {activeFolder.files.length} 個檔案</p>
                            </>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">媒體庫</h1>
                                <p className="text-sm text-slate-400 mt-1">依專案分類管理所有文件與照片</p>
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
                                        className="group cursor-pointer border-slate-200/60 hover:border-blue-300/60 hover:shadow-lg transition-all duration-300 overflow-hidden"
                                        onClick={() => setActiveFolder(folder)}
                                    >
                                        {/* Folder thumbnail or placeholder */}
                                        <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                                            {thumb ? (
                                                <img
                                                    src={thumb.url}
                                                    alt=""
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                                                    <Folder className="w-12 h-12 text-slate-300" />
                                                </div>
                                            )}
                                            {/* File count badges */}
                                            <div className="absolute bottom-2 right-2 flex gap-1.5">
                                                {folder.photoCount > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/80 text-white backdrop-blur-sm">
                                                        📷 {folder.photoCount}
                                                    </span>
                                                )}
                                                {folder.docCount > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/70 text-white backdrop-blur-sm">
                                                        📄 {folder.docCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <CardContent className="p-3">
                                            <p className="text-sm font-bold text-slate-800 truncate">{folder.projectCode}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">{folder.clientName} · {folder.estate}</p>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )
                ) : (
                    /* ─── Inside a Folder ─── */
                    <>
                        {/* Tab bar */}
                        <div className="flex gap-2">
                            {(['all', 'photos', 'docs'] as const).map(t => {
                                const labels = { all: `全部 (${activeFolder.files.length})`, photos: `照片 (${activeFolder.photoCount})`, docs: `文件 (${activeFolder.docCount})` };
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {labels[t]}
                                    </button>
                                );
                            })}
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
                                            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200/60 hover:border-blue-300/60 shadow-sm hover:shadow-lg transition-all duration-300"
                                            onClick={() => setPreviewFile(file)}
                                        >
                                            <img
                                                src={file.url}
                                                alt={file.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                                <p className="text-white text-xs font-medium truncate">{file.name}</p>
                                                <p className="text-white/60 text-[10px]">{formatSize(file.size)}</p>
                                            </div>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                                                <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
                                                    <ZoomIn size={14} className="text-slate-700" />
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.name); }}
                                                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 size={14} className="text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Document card */
                                        <div
                                            key={file.id}
                                            className="group relative rounded-xl bg-white border border-slate-200/60 hover:border-blue-300/60 shadow-sm hover:shadow-lg transition-all duration-300 p-4 flex flex-col items-center justify-center text-center gap-3 aspect-square cursor-pointer"
                                            onClick={() => window.open(file.url, '_blank')}
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
                                                <File className="w-7 h-7 text-blue-500" />
                                            </div>
                                            <div className="min-w-0 w-full">
                                                <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {file.type === 'quotation' ? '報價單' : file.type === 'drawing' ? '圖則' : file.type === 'contract' ? '合約' : '文件'} · {formatSize(file.size)}
                                                </p>
                                            </div>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                                                <a href={file.url} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors" onClick={e => e.stopPropagation()}>
                                                    <Download size={12} className="text-slate-600" />
                                                </a>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.name); }}
                                                    className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                    </>
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
