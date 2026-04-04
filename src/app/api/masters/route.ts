import { NextRequest, NextResponse } from 'next/server';
import { db as firestore, auth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/masters — list all masters
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    try {
        const snapshot = await firestore.collection('masters').get();
        const masters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        return NextResponse.json({ masters }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (err: any) {
        return NextResponse.json({ error: '獲取師傅列表失敗: ' + err.message }, { status: 500 });
    }
}

// POST /api/masters — create new master
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, skills, phone } = body;

        if (!name) {
            return NextResponse.json({ error: '請填寫師傅名稱' }, { status: 400 });
        }

        const mastersRef = firestore.collection('masters');
        const docRef = mastersRef.doc();

        const newMaster = {
            id: docRef.id,
            name,
            skills: skills || [],
            phone: phone || '',
            createdAt: new Date().toISOString(),
        };

        await docRef.set(newMaster);

        return NextResponse.json({ master: newMaster }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: '建立師傅失敗: ' + err.message }, { status: 500 });
    }
}
