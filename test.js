// diagnostic query
fetch('http://localhost:3000/api/employees', { headers: { 'Cookie': '' } })
    .then(r => r.json()).then(console.log).catch(console.error);
