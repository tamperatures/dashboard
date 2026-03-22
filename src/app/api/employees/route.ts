import { NextRequest, NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/employees — list all users (Admin and Staff can view)
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const snapshot = await firestore.collection('users').get();
    const users = snapshot.docs.map(doc => {
        const data = doc.data();
        const { password, ...rest } = data;
        return rest;
    });
    return NextResponse.json({ users }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}

// POST /api/employees — create new user
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const { role: currentUserRole, department: currentUserDept } = session.user as any;

    const body = await request.json();
    const { name, email, password, role, phone, position, department, departments } = body;

    if (!name || !email || !password) {
        return NextResponse.json({ error: '請填寫必要欄位' }, { status: 400 });
    }

    // Determine the departments logic:
    // Admin can set any departments. Staff forced to their own department.
    let assignedDepartments: string[] = departments || (department ? [department] : []);
    if (currentUserRole !== 'admin') {
        assignedDepartments = currentUserDept ? [currentUserDept] : [];
    }

    const usersRef = firestore.collection('users');

    // Check email uniqueness
    const existing = await usersRef.where('email', '==', email).get();
    if (!existing.empty) {
        return NextResponse.json({ error: '此電郵已被使用' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role: role || 'staff',
        department: assignedDepartments[0] || '', // legacy compat
        departments: assignedDepartments,
        phone: phone || '',
        position: position || '',
        mustChangePassword: true,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
    };

    await usersRef.doc(newUser.id).set(newUser);

    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
}
