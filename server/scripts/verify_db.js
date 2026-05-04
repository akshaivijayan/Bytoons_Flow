const db = require('./server/database');
setTimeout(() => {
    db.query("SELECT name FROM sqlite_master WHERE type='table'").then(tabs => {
        console.log('Tables in DB:', tabs.map(t => t.name));
        process.exit(0);
    }).catch(err => {
        console.error('Error listing tables:', err);
        process.exit(1);
    });
}, 2000);
