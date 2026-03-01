import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2 } from '@/lib/r2';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const { key } = await params;
        const fullKey = key.join('/');

        if (!fullKey) {
            return NextResponse.json({ error: '請提供檔案 Key' }, { status: 400 });
        }

        await deleteFromR2(fullKey);

        return NextResponse.json({ success: true, deleted: fullKey });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: '刪除失敗' },
            { status: 500 }
        );
    }
}
