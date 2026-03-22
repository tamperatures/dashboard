const admin = require('firebase-admin');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');
let privateKey = '';
lines.forEach(line => {
    if (line.startsWith('FIREBASE_PRIVATE_KEY=')) {
        privateKey = line.split('FIREBASE_PRIVATE_KEY=')[1].trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    }
});

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: "tpt-system",
    clientEmail: "firebase-adminsdk-fbsvc@tpt-system.iam.gserviceaccount.com",
    privateKey: privateKey
  })
});

async function run() {
  const db = admin.firestore();
  
  // 1. Delete old UUID users
  const obsoleteIds = [
    '32d65a16-76f0-46cd-974a-fae733de5851',
    '43a98806-11e0-40e0-a94c-dee2c56458c4',
    '70561265-cd0a-40f9-a916-ea6461b40dc4',
    'b47f09dd-df38-45df-9368-46ce936cfb9f',
    'f5f52e98-5ad7-4df6-8bcc-70306658c881',
    'f970ef7a-367c-4a7f-8f68-72eacf3d98ec'
  ];
  for (const id of obsoleteIds) {
    try { await admin.auth().deleteUser(id); } catch (e) {}
    await db.collection('users').doc(id).delete();
    console.log(`Deleted ${id}`);
  }

  // 2. Update the departments for the correct Firebase Auth users
  const updates = [
    { id: 'whMhYEFkwdchUoQ3BsLtMp6J9c83', name: 'Mike Tam', depts: ['管理處', '推廣部'], dept: '管理處' },
    { id: 'nsEn1QsrXENsP6Ot2Iv0YqIRKxf2', name: 'Kate Li', depts: ['銷售部'], dept: '銷售部' },
    { id: 'f0FP0AZV6mYMdEBKbPurnSpfBl43', name: 'Yean Chu', depts: ['設計部'], dept: '設計部' },
    { id: 'HkJ2RZ4HfOUFxQu4YJ46Y0U2Tf62', name: 'Gary Chan', depts: ['工程部'], dept: '工程部' },
    { id: 'B8XDGV20XlSN7AHDtwcOheqsDaG3', name: 'Visionerse', depts: ['管理處'], dept: '管理處' }
  ];
  for (const update of updates) {
    await db.collection('users').doc(update.id).update({
      departments: update.depts,
      department: update.dept
    });
    console.log(`Updated ${update.name}`);
  }
}
run().catch(console.error);
