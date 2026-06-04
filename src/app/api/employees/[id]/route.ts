import { NextRequest, NextResponse } from 'next/server';
import { db as firestore, adminAuth, auth } from '@/lib/firebase-admin';

// GET /api/employees/[id] - fetch a specific user
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { id } = await params;
    const userDoc = await firestore.collection('users').doc(id).get();

    if (!userDoc.exists) return NextResponse.json({ error: '找不到此用戶' }, { status: 404 });
    const { password, ...rest } = userDoc.data() as any;

    return NextResponse.json({ user: rest }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}

// PUT /api/employees/[id] — update user
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }
    const currentUserReq = session.user as any;

    const { id } = await params;
    const body = await request.json();
    const userRef = firestore.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: '找不到此用戶' }, { status: 404 });
    }

    const userToEdit = userDoc.data() as any;

    console.log('--- PUT /api/employees/[id] ---');
    console.log('currentUserReq:', JSON.stringify(currentUserReq));
    console.log('userToEdit:', JSON.stringify(userToEdit));

    if (currentUserReq.role !== 'admin') {
        const editDepts = userToEdit.departments || (userToEdit.department ? [userToEdit.department] : []);
        console.log('editDepts:', editDepts, 'currentUserReq.department:', currentUserReq.department);
        if (!editDepts.includes(currentUserReq.department)) {
            return NextResponse.json({ error: '權限不足，只能編輯同部門同事' }, { status: 403 });
        }
    }

    const { name, email, role, phone, position, status, password, department, departments } = body;
    const updates: any = {};

    console.log('updates from body:', body);

    if (name) {
        updates.name = name;
        await adminAuth.updateUser(id, { displayName: name }).catch(() => null);
    }
    if (email) {
        updates.email = email;
        await adminAuth.updateUser(id, { email }).catch(() => null);
    }
    if (role && currentUserReq.role === 'admin') {
        console.log('updating role to:', role);
        updates.role = role;
    } else {
        console.log('NOT updating role. role from body:', role, 'currentUserReq.role:', currentUserReq.role);
    }
    if (phone !== undefined) updates.phone = phone;
    if (position !== undefined) updates.position = position;
    if (status) {
        updates.status = status;
        await adminAuth.updateUser(id, { disabled: status !== 'active' }).catch(() => null);
    }
    if (departments && currentUserReq.role === 'admin') {
        updates.departments = departments;
        updates.department = departments[0] || ''; // legacy compat
    } else if (department && currentUserReq.role === 'admin') {
        updates.department = department;
        updates.departments = [department];
    }
    if (password) {
        // Only admins can reset another user's password
        if (currentUserReq.role !== 'admin' && currentUserReq.id !== id) {
            return NextResponse.json({ error: '只有管理員可以重設其他用戶的密碼' }, { status: 403 });
        }
        try {
            await adminAuth.updateUser(id, { password });
            // Mark that user must change password on next login (if reset by admin)
            if (currentUserReq.id !== id) {
                updates.mustChangePassword = true;
            }
        } catch (err: any) {
            console.error('Failed to update password in Firebase Auth:', err);
            return NextResponse.json({ error: '密碼重設失敗: ' + (err.message || '未知錯誤') }, { status: 500 });
        }
    }

    await userRef.update(updates);

    const updatedDoc = await userRef.get();
    const { password: _, ...userWithoutPassword } = updatedDoc.data() as any;
    return NextResponse.json({ user: userWithoutPassword });
}

// DELETE /api/employees/[id] — delete user
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { id } = await params;
    const currentUserReq = session.user as any;
    const currentUserId = currentUserReq.id;

    if (id === currentUserId) {
        return NextResponse.json({ error: '不能刪除自己的帳號' }, { status: 400 });
    }

    const userRef = firestore.collection('users').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return NextResponse.json({ error: '找不到此用戶' }, { status: 404 });
    }

    if (currentUserReq.role !== 'admin') {
        const delDepts = userDoc.data()?.departments || (userDoc.data()?.department ? [userDoc.data()?.department] : []);
        if (!delDepts.includes(currentUserReq.department)) {
            return NextResponse.json({ error: '權限不足，只能刪除同部門同事' }, { status: 403 });
        }
    }

    await adminAuth.deleteUser(id).catch(() => console.error('Failed to delete from Firebase Auth:', id));
    await userRef.delete();

    return NextResponse.json({ success: true });
}
