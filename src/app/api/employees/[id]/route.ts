import { NextRequest, NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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

    if (currentUserReq.role !== 'admin') {
        const editDepts = userToEdit.departments || (userToEdit.department ? [userToEdit.department] : []);
        if (!editDepts.includes(currentUserReq.department)) {
            return NextResponse.json({ error: '權限不足，只能編輯同部門同事' }, { status: 403 });
        }
    }

    const { name, email, role, phone, position, status, password, department, departments } = body;
    const updates: any = {};

    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role && currentUserReq.role === 'admin') updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (position !== undefined) updates.position = position;
    if (status) updates.status = status;
    if (departments && currentUserReq.role === 'admin') {
        updates.departments = departments;
        updates.department = departments[0] || ''; // legacy compat
    } else if (department && currentUserReq.role === 'admin') {
        updates.department = department;
        updates.departments = [department];
    }
    if (password) {
        updates.password = await bcrypt.hash(password, 10);
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

    await userRef.delete();

    return NextResponse.json({ success: true });
}
