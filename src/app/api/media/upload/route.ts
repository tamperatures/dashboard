import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const projectId = formData.get('projectId') as string | null;
        const phase = formData.get('phase') as string | null;

        if (!file) {
            return NextResponse.json({ error: '請選擇檔案' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'video/mp4', 'video/quicktime',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: '不支援的檔案類型' }, { status: 400 });
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json({ error: '檔案大小不能超過 20MB' }, { status: 400 });
        }

        // Generate unique key
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const prefix = projectId ? `projects/${projectId}/` : 'uploads/';
        const phasePrefix = phase ? `${phase}/` : '';
        const key = `${prefix}${phasePrefix}${timestamp}_${safeName}`;

        // Convert to buffer and upload
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToR2(key, buffer, file.type);

        return NextResponse.json({
            success: true,
            key,
            url,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: '上傳失敗，請稍後再試' },
            { status: 500 }
        );
    }
}
