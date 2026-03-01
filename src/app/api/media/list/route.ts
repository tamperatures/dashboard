import { NextRequest, NextResponse } from 'next/server';
import { listFromR2, getPublicUrl } from '@/lib/r2';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const prefix = searchParams.get('prefix') || undefined;

        const objects = await listFromR2(prefix);

        const items = objects.map((obj) => ({
            key: obj.Key || '',
            url: getPublicUrl(obj.Key || ''),
            fileName: (obj.Key || '').split('/').pop() || '',
            size: obj.Size || 0,
            uploadedAt: obj.LastModified?.toISOString() || '',
        }));

        // Sort by newest first
        items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

        return NextResponse.json({ items });
    } catch (error) {
        console.error('List error:', error);
        return NextResponse.json(
            { error: '無法讀取媒體列表' },
            { status: 500 }
        );
    }
}
