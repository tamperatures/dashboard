import { NextRequest, NextResponse } from 'next/server';
import { generateProjectCode } from '@/lib/db';
import { db as firestore } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';

// GET /api/projects — list projects (all users see all projects)
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    // All authenticated users can view all projects
    const snapshot = await firestore.collection('projects').get();
    const projects = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ projects });
}

// POST /api/projects — create project (Admin only)
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
        return NextResponse.json({ error: '權限不足' }, { status: 403 });
    }

    const body = await request.json();
    const {
        clientName, estate, address, phone, propertyType,
        renovationType, budget, description, assignedTo, pmResponsible,
        // New S01 fields
        area, meetingDateTime, meetingLocation, googleFormLink, notes,
        familyStructure, status, contractDate
    } = body;

    if (!clientName || !estate || !address) {
        return NextResponse.json({ error: '請填寫必要欄位' }, { status: 400 });
    }

    const newProject = {
        id: uuidv4(),
        projectCode: await generateProjectCode(firestore),
        clientName,
        estate,
        address,
        phone: phone || '',
        propertyType: propertyType || '私樓',
        renovationType: renovationType || '全屋裝修',
        budget: Number(budget) || 0,
        stage: 'S01_客戶查詢' as const,
        status: status || 'In Progress', // default status
        progress: 0,
        startDate: '',
        endDate: '',
        assignedTo: assignedTo || [],
        pmResponsible: pmResponsible || '',
        description: description || '',
        // S01 fields
        area: area || '',
        familyStructure: familyStructure || '',
        contractDate: contractDate || '',
        meetingDateTime: meetingDateTime || '',
        meetingLocation: meetingLocation || '',
        googleFormLink: googleFormLink || '',
        notes: notes || '',
        floorPlanLink: '',
        sketchUpLink: '',
        trades: [] as { name: string; status: 'pending' | 'in_progress' | 'completed' }[],
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await firestore.collection('projects').doc(newProject.id).set(newProject);

    return NextResponse.json({ project: newProject }, { status: 201 });
}
