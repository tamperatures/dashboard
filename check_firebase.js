const admin = require('firebase-admin');

// Ensure correct spacing for the private key
const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDyrc9laqIZaoOw\niNUya6f2bFt8qVh8BfF+THunRnEwACG3V1wL928bE5bnvKIW2v0qGja0f0ZbH2Xq\nHK0CyaDgvG9w9iciQHruCIaEQvtzi6wLMPcsb++wMwVkFZOnXQpIPz3Lb1pPO0rU\nhZ9w+fmSwq0NrxxzOnnyWD5VtqWrTMiVRGsbWDSj0uTJXK8BE5buTCr+8kRAAt4R\n5LqDCjzERK+/rXftWjmRiwj4Ri40v7PWSEz8FRsJVkxfifBWelseIJVEwCxmeGC9\n3zx2svZcBMQmGOZmYJ1+YhaAkziRnLLUCGKny+h/dBaZCT9wPKbeKth6hyJSHq9x\ntuPD1JerAgMBAAECggEAE4R8wncohqsai0dTVOTz/cLU5XpIi7T9/qk6ZVzU0UZO\nxTbpSBcZivpw2mjBOohYmxsU8kBYPA+S5pjG0LYUUm7P9wGnv76i2bkQJIavQCmS\nvSsDfhdEljhhmHKPIliTxqAQzBHubU04pU4CjEIL20yn7AqnhZxFiYL6WcdrnJKo\nvpyMeeJfzdvcV4Js0QhggI7tgiEr5irzoSrDKhdVgF3QHwJMOjwU6nnZP5x8A8IF\nuoyAjgcn7QBRsv8IO7334PqY498lfaaClcas1qVMU3BZjU5eKodO/DsWImYOy9Gk\n7jc5zOqem1G9EFoN9nKbTam9hbKCyxCUZ/dbbTJgEQKBgQD6s+xrppVDA23cOzxF\nJ7wUgIF6FxDpg8tpMMMwI8Q5e6UvwKHiM1pHx/JQetkkxGGkd9pkRCoyC1JFfF+i\ne/a6Xth/M0X3w72FS5K/8Hlb1u1N/y2PtVYtdSLVMqmLYONNRjAnfHpoSquv9cF2\nho5lCQ9zqtVlTE7fb7zrFKCvcQKBgQD3znwSifgeMZFoZYSWdjofmhL1byDsB5Q1\nkFEx71BDt5acyDsVBlf17/Yh74DreebAIgW5IJUAaUCuGH/IZX4/P0VGirRI6kGN\nZ/1OFa8BN0qfGr2MH2hH3AJv1Zbr3/ThvoDczO2VtYfwaoNz9Qa87Q69mUmAVPQL\n6mIiGmmi2wKBgQDxCEVYpptBB637HFRw5Kf2Siqx2DVhXV4W71PqF6kT3yXNCHZb\nxSWad8knyUS2Db0W5EhrOAIdhTb/KXnE/UwUmRWrDf/KGz4+Ro97zFbRjo0u/RSv\n4xdMsx7fPUs2fttqsv2fKRWC6a+xiCUNsIZ86z4Y5fku4DPArGxE09s9cQKBgAtc\nx2meM+dGhJFR3lN71kxupyHj15GbA1u1Y1Oz0m1YdKp5r+PV56CaQSHrNnEVpNP4\ne2SyrsJXESUqcGmC5dgGkambYIrbWugd9YpoCh83Js/GzRwosIJi/yWbmJD2MudK\n8eOt7dLogPQwHhjqCkYNZJii97DPtGT7eUZxCZjzAoGAHWg/d9CpbqVf0Ni1j36X\nCAd7T+R9HZPdKErJBByo+VH/1jhBb8vVaVD+L5pKXAejRzDObj/F6nQiHgX3r/zK\nrmtiuAEw1CQ4cj52Xs0QlRnmdbvTB8QgAJ54cxMGJWyr0IczK21h2SZx8uHWj6xj\n0o1e6yExE9s65wwfE/rB23U=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "tpt-system",
            clientEmail: "firebase-adminsdk-fbsvc@tpt-system.iam.gserviceaccount.com",
            privateKey: privateKey,
        })
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
