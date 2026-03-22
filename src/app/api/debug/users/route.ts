import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
export const dynamic = 'force-dynamic';
export async function GET() {
    const s = await db.collection('users').get();
    return NextResponse.json({ users: s.docs.map(d => d.data()) });
}
