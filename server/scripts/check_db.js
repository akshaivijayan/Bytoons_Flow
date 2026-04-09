const db = require('./server/database');

async function testConnection() {
    try {
        const row = await db.getOne('SELECT date() as now');
        console.log('[SUCCESS] Database connected! SQLite Date:', row.now);
        process.exit(0);
    } catch (err) {
        console.error('[FAILURE] Database connection error:', err.message);
        process.exit(1);
    }
}

setTimeout(testConnection, 1000); // Give it a sec to connect & migrate
