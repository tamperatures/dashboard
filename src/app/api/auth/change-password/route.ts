import { NextRequest, NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: '密碼必須至少為6個字元' }, { status: 400 });
    }

    const userId = session.user?.id;
    if (!userId) {
        return NextResponse.json({ error: '找不到使用者' }, { status: 404 });
    }

    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: '找不到使用者' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userRef.update({
        password: hashedPassword,
        mustChangePassword: false
    });

    return NextResponse.json({ success: true });
}
