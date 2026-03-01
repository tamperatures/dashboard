'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
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
    Camera,
    Upload,
    X,
    Trash2,
    Loader2,
    ImageIcon,
    ZoomIn,
    Check,
    AlertCircle,
    FolderOpen,
    ChevronDown,
} from 'lucide-react';

interface MediaFile {
    key: string;
    url: string;
    fileName: string;
    size: number;
    contentType?: string;
    uploadedAt: string;
}

export default function MediaPage() {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing media on load
    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/media/list');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setFiles(data.items || []);
        } catch {
            // No R2 configured yet — show empty state
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = useCallback(async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);
        setError(null);
        setUploadSuccess(false);

        const totalFiles = fileList.length;
        let completed = 0;

        for (const file of Array.from(fileList)) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/media/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '上傳失敗');
                }

                const data = await res.json();

                setFiles(prev => [{
                    key: data.key,
                    url: data.url,
                    fileName: data.fileName,
                    size: data.size,
                    contentType: data.contentType,
                    uploadedAt: data.uploadedAt,
                }, ...prev]);

                completed++;
                setUploadProgress(Math.round((completed / totalFiles) * 100));
            } catch (err) {
                setError(err instanceof Error ? err.message : '上傳失敗');
            }
        }

        setIsUploading(false);
        if (completed > 0) {
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
        }
    }, []);

    const handleDelete = async (key: string) => {
        try {
            const res = await fetch(`/api/media/${key}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setFiles(prev => prev.filter(f => f.key !== key));
            setPreviewFile(null);
        } catch {
            setError('刪除失敗');
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleUpload(e.dataTransfer.files);
    }, [handleUpload]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <motion.div
            className="max-w-[1600px] mx-auto space-y-6 pb-12"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">媒體庫</h1>
                    <p className="text-sm text-slate-400 mt-1">上傳及管理工地現場照片和影片</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">
                        {files.length} 個檔案
                    </span>
                </div>
            </div>

            {/* Upload Zone */}
            <Card className="border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors overflow-hidden">
                <CardContent className="p-0">
                    <div
                        className={`relative flex flex-col items-center justify-center py-12 px-6 cursor-pointer transition-all ${dragActive
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-slate-50/50 hover:bg-slate-50'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/mp4,video/quicktime"
                            multiple
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files)}
                        />

                        {isUploading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <Loader2 size={40} className="text-blue-500 animate-spin" />
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                                        {uploadProgress}%
                                    </span>
                                </div>
                                <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-sm font-medium text-slate-600">上傳中...</p>
                            </div>
                        ) : uploadSuccess ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Check size={28} className="text-emerald-600" />
                                </div>
                                <p className="text-sm font-medium text-emerald-600">上傳成功！</p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile: Camera button */}
                                <div className="sm:hidden flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                                        <Camera size={36} className="text-white" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-base font-bold text-slate-700">拍攝或選擇照片</p>
                                        <p className="text-xs text-slate-400 mt-1">支援 JPG, PNG, HEIC, MP4</p>
                                    </div>
                                </div>

                                {/* Desktop: Drag & drop */}
                                <div className="hidden sm:flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
                                        <Upload size={28} className="text-white" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-base font-bold text-slate-700">
                                            拖放照片到此處，或{' '}
                                            <span className="text-blue-600">點擊選擇檔案</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            支援 JPG, PNG, HEIC, MP4 · 最大 20MB
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Gallery Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="text-blue-500 animate-spin" />
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <FolderOpen size={36} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-400">尚無媒體檔案</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">
                        上傳您的第一張工地照片開始使用媒體庫。<br />
                        請先在 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env.local</code> 配置 R2 設定。
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {files.map((file) => (
                        <div
                            key={file.key}
                            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer border border-slate-200/60 hover:border-blue-300/60 shadow-sm hover:shadow-lg transition-all duration-300"
                            onClick={() => setPreviewFile(file)}
                        >
                            {file.contentType?.startsWith('video/') ? (
                                <video
                                    src={file.url}
                                    className="w-full h-full object-cover"
                                    muted
                                />
                            ) : (
                                <img
                                    src={file.url}
                                    alt={file.fileName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                <p className="text-white text-xs font-medium truncate">{file.fileName}</p>
                                <p className="text-white/60 text-[10px]">{formatSize(file.size)}</p>
                            </div>

                            {/* Zoom icon */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
                                    <ZoomIn size={14} className="text-slate-700" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Full-screen Preview Dialog */}
            <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-black/95 border-0">
                    <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-white text-sm font-medium truncate pr-8">
                                {previewFile?.fileName}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    {previewFile && (
                        <div className="flex items-center justify-center min-h-[50vh] max-h-[80vh] p-4 pt-16">
                            {previewFile.contentType?.startsWith('video/') ? (
                                <video
                                    src={previewFile.url}
                                    controls
                                    className="max-w-full max-h-full rounded-lg"
                                />
                            ) : (
                                <img
                                    src={previewFile.url}
                                    alt={previewFile.fileName}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            )}
                        </div>
                    )}

                    {/* Bottom bar */}
                    {previewFile && (
                        <div className="p-4 border-t border-white/10 flex items-center justify-between">
                            <div className="text-sm text-white/60">
                                {formatSize(previewFile.size)} · {new Date(previewFile.uploadedAt).toLocaleDateString('zh-HK')}
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(previewFile.key)}
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
    );
}
