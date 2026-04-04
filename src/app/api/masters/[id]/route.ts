import { NextRequest, NextResponse } from 'next/server';
import { db as firestore, auth } from '@/lib/firebase-admin';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    try {
        await firestore.collection('masters').doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
    }
}
