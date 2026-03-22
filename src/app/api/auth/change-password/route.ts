import { NextRequest, NextResponse } from 'next/server';
import { db as firestore, adminAuth, auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: '密碼必須至少為6個字元' }, { status: 400 });
    }

    const userId = session.user.id;

    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: '找不到使用者' }, { status: 404 });
    }

    try {
        await adminAuth.updateUser(userId, {
            password: newPassword
        });

        await userRef.update({
            mustChangePassword: false
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Password change error', err);
        return NextResponse.json({ error: '密碼更新失敗: ' + err.message }, { status: 500 });
    }
}
