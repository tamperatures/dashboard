const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function check() {
    const users = await db.collection('users').get();
    users.docs.forEach(d => {
        const data = d.data();
        console.log(`${data.email} | ${data.name} | Role: ${data.role} | Depts: ${data.departments || data.department}`);
    });
}

check();
