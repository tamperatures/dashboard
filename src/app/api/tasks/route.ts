import { NextResponse } from 'next/server';
import { db as firestore } from '@/lib/firebase-admin';
import type { Task } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');

    let query: FirebaseFirestore.Query = firestore.collection('tasks');

    if (projectId) {
        query = query.where('projectId', '==', projectId);
    }
    if (assigneeId) {
        query = query.where('assigneeId', '==', assigneeId);
    }

    const snapshot = await query.get();
    const tasks = snapshot.docs.map(doc => doc.data());

    return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin' && (session.user as any).role !== 'staff') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { projectId, title, type, date, assigneeId } = body;

        if (!projectId || !title || !type || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newTask: Task = {
            id: uuidv4(),
            projectId,
            title,
            type,
            date,
            assigneeId: type === 'task' ? assigneeId : undefined,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await firestore.collection('tasks').doc(newTask.id).set(newTask);

        return NextResponse.json({ task: newTask }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
