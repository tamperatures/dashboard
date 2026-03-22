import { NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin' && (session.user as any).role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const body = await request.json();

        const taskRef = firestore.collection('tasks').doc(id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        await taskRef.update(body);

        const updatedTask = (await taskRef.get()).data();
        return NextResponse.json({ task: updatedTask });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin' && (session.user as any).role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;
        const taskRef = firestore.collection('tasks').doc(id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        await taskRef.delete();
        return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
